"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Cabecera, Contador } from "@/components/Cabecera";
import { Check, Cruz } from "@/components/Iconos";
import { botonPrincipal, tituloPantalla } from "@/components/estilos";
import { MAX_PLATOS, PLATOS, buscarPlato } from "@/lib/platos";
import { acciones, usePedido } from "@/lib/store";

export default function Platos() {
  const { platos: elegidos } = usePedido();
  const n = elegidos.length;
  const lleno = n >= MAX_PLATOS;

  useEffect(() => {
    acciones.limpiarPlatos((id) => !!buscarPlato(id));
  }, []);

  const botonVer = n > 0 ? (
    <Link href="/pedido" className={botonPrincipal}>
      Ver mi pedido
    </Link>
  ) : (
    <button type="button" disabled className={botonPrincipal}>
      Elige al menos un plato
    </button>
  );

  return (
    <div className="mx-auto max-w-xl lg:grid lg:max-w-6xl lg:grid-cols-[1fr_340px] lg:gap-10 lg:px-10 lg:py-10">
      <main className="pb-36 lg:pb-0">
        <div className="flex flex-col gap-3.5 px-5 pt-5 pb-4 lg:px-0 lg:pt-0 lg:pb-8">
          <Cabecera volverA="/" etiquetaVolver="Volver al inicio" n={n} />
          <div className="flex flex-col gap-1.5">
            <h1 className={tituloPantalla}>¿Qué te apetece?</h1>
            <p className="text-[15px] leading-[1.4] lg:text-lg">Máximo 5 platos y sin repetir. Elige con hambre.</p>
          </div>
        </div>

        <ul className="grid gap-3 px-5 lg:grid-cols-2 lg:gap-5 lg:px-0 2xl:grid-cols-3">
          {PLATOS.map((p) => {
            const elegido = elegidos.includes(p.id);
            const bloqueado = !elegido && lleno;
            return (
              <li
                key={p.id}
                className={`flex gap-3.5 rounded-[20px] bg-bruma p-3 lg:flex-col lg:rounded-[28px] lg:p-4 ${
                  elegido ? "outline-[3px] outline-naranja outline-solid -outline-offset-[3px]" : ""
                }`}
              >
                <Image
                  src={p.foto}
                  alt={p.nombre}
                  width={400}
                  height={400}
                  sizes="(min-width: 1024px) 300px, 96px"
                  className="h-28 w-24 shrink-0 rounded-[14px] object-cover lg:aspect-[4/3] lg:h-auto lg:w-full lg:rounded-[20px]"
                />
                <div className="flex min-w-0 grow gap-3.5">
                  <div className="flex min-w-0 grow flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-[1.2px] text-gris">{p.categoria}</p>
                    <h2 className="font-titulo text-lg font-bold leading-[1.15]">{p.nombre}</h2>
                    <p className="text-[13px] leading-[1.35] text-tinta lg:text-sm">{p.descripcion}</p>
                  </div>
                  <div className="flex shrink-0 items-center lg:items-end">
                    <button
                      type="button"
                      onClick={() => acciones.alternarPlato(p.id)}
                      disabled={bloqueado}
                      aria-pressed={elegido}
                      aria-label={`Añadir ${p.nombre}`}
                      title={bloqueado ? "Ya tienes 5 platos" : elegido ? "Quitar del pedido" : "Añadir al pedido"}
                      className={`flex size-[52px] items-center justify-center rounded-full text-[17px] font-bold transition-colors ${
                        elegido
                          ? "bg-naranja text-noche hover:bg-naranja-hover"
                          : bloqueado
                            ? "cursor-not-allowed border-2 border-borde bg-white text-gris-claro"
                            : "bg-noche text-white hover:bg-noche-hover"
                      }`}
                    >
                      {elegido ? <Check size={24} /> : "+1"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p role="status" className="px-5 py-4 text-center text-sm font-bold lg:px-0 lg:text-base">
          {lleno ? "Has llegado a los 5 platos. Quita uno si quieres cambiar." : ""}
        </p>
      </main>

      {/* Ordenador: pedido en panel lateral fijo */}
      <aside className="hidden lg:block" aria-label="Tu pedido">
        <div className="sticky top-10 flex flex-col gap-5 rounded-[28px] bg-bruma p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-titulo text-2xl font-extrabold">Tu pedido</h2>
            <Contador n={n} />
          </div>
          {n === 0 ? (
            <p className="text-[15px] leading-normal text-tinta">
              Aquí no hay nada todavía. Tu nevera te está mirando con preocupación.
            </p>
          ) : (
            <ol className="flex flex-col">
              {elegidos.map((id, i) => {
                const p = buscarPlato(id);
                if (!p) return null;
                return (
                  <li key={id} className="flex items-center gap-3 border-t-2 border-noche py-3">
                    <span className="w-6 font-titulo font-bold">{String(i + 1).padStart(2, "0")}</span>
                    <Image src={p.foto} alt="" width={44} height={44} className="size-11 rounded-[10px] object-cover" />
                    <span className="min-w-0 grow font-titulo text-[15px] font-bold leading-tight">{p.nombre}</span>
                    <button
                      type="button"
                      onClick={() => acciones.quitarPlato(id)}
                      aria-label={`Quitar ${p.nombre}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-white"
                    >
                      <Cruz size={16} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {botonVer}
        </div>
      </aside>

      {/* Móvil: botón fijo abajo */}
      <div className="fixed inset-x-0 bottom-0 border-t border-linea bg-white px-5 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-xl">{botonVer}</div>
      </div>
    </div>
  );
}
