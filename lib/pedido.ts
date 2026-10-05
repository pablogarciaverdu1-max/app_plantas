import { MAX_PLATOS, buscarPlato } from "@/lib/platos";
import { esFechaEntregable } from "@/lib/fechas";

export type DatosCliente = {
  nombre: string;
  telefono: string;
  direccion: string;
  observaciones: string;
};

export type PedidoEntrante = {
  platos: string[];
  fecha: string | null;
  cliente: DatosCliente;
};

export function telefonoValido(telefono: string): boolean {
  const digitos = telefono.replace(/[\s.\-()]/g, "");
  return /^\+?\d{9,15}$/.test(digitos);
}

export function datosCompletos(c: DatosCliente): boolean {
  return c.nombre.trim() !== "" && telefonoValido(c.telefono) && c.direccion.trim() !== "";
}

/**
 * Reglas del pedido. Se usan en pantalla y, sobre todo, en el servidor.
 * Devuelve el primer problema encontrado, o null si todo está bien.
 */
export function validarPedido(p: PedidoEntrante): string | null {
  if (!Array.isArray(p.platos) || p.platos.length === 0) {
    return "Tu pedido está vacío. Elige al menos un plato.";
  }
  if (p.platos.length > MAX_PLATOS) {
    return `Como mucho ${MAX_PLATOS} platos por pedido.`;
  }
  if (new Set(p.platos).size !== p.platos.length) {
    return "Hay un plato repetido. Cada plato va una sola vez.";
  }
  if (p.platos.some((id) => typeof id !== "string" || !buscarPlato(id))) {
    return "Alguno de tus platos ya no está en la carta. Vuelve a elegir.";
  }
  if (!p.fecha || !esFechaEntregable(p.fecha)) {
    return "Elige un día de entrega a partir de mañana.";
  }
  const c = p.cliente;
  if (!c || typeof c.nombre !== "string" || !c.nombre.trim()) {
    return "Falta tu nombre.";
  }
  if (typeof c.telefono !== "string" || !telefonoValido(c.telefono)) {
    return "Revisa el teléfono: necesitamos uno válido para avisarte.";
  }
  if (typeof c.direccion !== "string" || !c.direccion.trim()) {
    return "Falta la dirección de entrega.";
  }
  if (c.observaciones !== undefined && typeof c.observaciones !== "string") {
    return "Las observaciones no tienen buena pinta.";
  }
  if (c.nombre.length > 100 || c.direccion.length > 300 || (c.observaciones ?? "").length > 500) {
    return "Algún dato es demasiado largo. Resúmelo un poco.";
  }
  return null;
}
