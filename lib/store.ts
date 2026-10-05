"use client";

import { useSyncExternalStore } from "react";
import type { DatosCliente } from "@/lib/pedido";
import { MAX_PLATOS } from "@/lib/platos";

// Estado del pedido en el navegador. Se guarda en sessionStorage para que
// no se pierda al recargar, ir atrás o si falla el envío.

export type Estado = {
  platos: string[];
  fecha: string | null;
  cliente: DatosCliente;
  confirmado: { platos: number; fecha: string } | null;
};

const CLAVE = "vastocupada-pedido";

const VACIO: Estado = {
  platos: [],
  fecha: null,
  cliente: { nombre: "", telefono: "", direccion: "", observaciones: "" },
  confirmado: null,
};

let estado: Estado = VACIO;
let cargado = false;
const oyentes = new Set<() => void>();

function cargar() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  try {
    const guardado = window.sessionStorage.getItem(CLAVE);
    if (guardado) {
      const e = JSON.parse(guardado) as Partial<Estado>;
      estado = { ...VACIO, ...e, cliente: { ...VACIO.cliente, ...e.cliente } };
    }
  } catch {
    // sin almacenamiento: seguimos en memoria
  }
}

function guardar(siguiente: Estado) {
  estado = siguiente;
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // sin almacenamiento: seguimos en memoria
  }
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

function leer() {
  cargar();
  return estado;
}

export function usePedido(): Estado {
  return useSyncExternalStore(suscribir, leer, () => VACIO);
}

/** false durante el primer render (servidor/hidratación), true después. */
export function useHidratado(): boolean {
  return useSyncExternalStore(suscribir, () => true, () => false);
}

export const acciones = {
  alternarPlato(id: string) {
    const { platos } = leer();
    if (platos.includes(id)) {
      guardar({ ...estado, platos: platos.filter((p) => p !== id) });
    } else if (platos.length < MAX_PLATOS) {
      guardar({ ...estado, platos: [...platos, id] });
    }
  },
  quitarPlato(id: string) {
    guardar({ ...leer(), platos: leer().platos.filter((p) => p !== id) });
  },
  elegirFecha(fecha: string) {
    guardar({ ...leer(), fecha });
  },
  cambiarCliente(campo: keyof DatosCliente, valor: string) {
    const e = leer();
    guardar({ ...e, cliente: { ...e.cliente, [campo]: valor } });
  },
  /** Pedido recibido: vaciamos el carrito y dejamos el resumen para Gracias. */
  confirmar(platos: number, fecha: string) {
    guardar({ ...VACIO, confirmado: { platos, fecha } });
  },
  /** Ids que ya no están en la carta (si la rotaste mientras el cliente elegía). */
  limpiarPlatos(validos: (id: string) => boolean) {
    const e = leer();
    const platos = e.platos.filter(validos);
    if (platos.length !== e.platos.length) guardar({ ...e, platos });
  },
  vaciar() {
    guardar(VACIO);
  },
};
