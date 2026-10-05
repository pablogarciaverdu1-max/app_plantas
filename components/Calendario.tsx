"use client";

import { useState } from "react";
import { Anterior, Siguiente } from "@/components/Iconos";
import { MESES, claveFecha, fechaLarga, hoyEnMadrid } from "@/lib/fechas";

const CABECERA = [
  ["L", "lunes"], ["M", "martes"], ["X", "miércoles"], ["J", "jueves"],
  ["V", "viernes"], ["S", "sábado"], ["D", "domingo"],
];

const botonMes =
  "flex size-11 items-center justify-center rounded-full bg-white text-noche transition-colors hover:bg-linea disabled:cursor-not-allowed disabled:opacity-40";

/** Calendario mensual. Solo deja elegir días a partir de mañana. */
export function Calendario({ valor, onElegir }: { valor: string | null; onElegir: (clave: string) => void }) {
  const hoy = hoyEnMadrid();
  const [hoyA, hoyM] = hoy.split("-").map(Number);
  const inicio = valor ?? hoy;
  const [vista, setVista] = useState(() => {
    const [a, m] = inicio.split("-").map(Number);
    return { a, m: m - 1 };
  });

  const enMesActual = vista.a === hoyA && vista.m === hoyM - 1;
  const mover = (paso: number) => {
    const d = new Date(Date.UTC(vista.a, vista.m + paso, 1));
    setVista({ a: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  const primerDia = new Date(Date.UTC(vista.a, vista.m, 1)).getUTCDay();
  const huecos = (primerDia + 6) % 7; // semana empezando en lunes
  const totalDias = new Date(Date.UTC(vista.a, vista.m + 1, 0)).getUTCDate();
  const nombreMes = MESES[vista.m].charAt(0).toUpperCase() + MESES[vista.m].slice(1);

  return (
    <section aria-labelledby="titulo-calendario" className="flex flex-col gap-3 rounded-[20px] bg-bruma p-4 lg:rounded-[28px] lg:p-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="titulo-calendario" className="font-titulo text-xl font-bold leading-[1.2] lg:text-2xl">
          ¿Qué día te lo llevamos?
        </h2>
        <p aria-live="polite" className="text-sm font-medium">
          {valor ? `Entrega: ${fechaLarga(valor)}` : "Elige un día en el calendario."}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => mover(-1)} disabled={enMesActual} aria-label="Mes anterior" className={botonMes}>
          <Anterior size={18} />
        </button>
        <p className="text-base font-bold" aria-live="polite">
          {nombreMes} {vista.a}
        </p>
        <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className={botonMes}>
          <Siguiente size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-bold text-gris" aria-hidden="true">
        {CABECERA.map(([letra, dia]) => (
          <div key={dia} title={dia}>{letra}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: huecos }, (_, i) => (
          <div key={`h${i}`} className="h-11" />
        ))}
        {Array.from({ length: totalDias }, (_, i) => {
          const dia = i + 1;
          const clave = claveFecha(vista.a, vista.m, dia);
          const elegible = clave > hoy;
          const elegido = clave === valor;
          return (
            <div key={clave} className="flex h-11 items-center justify-center">
              {elegible ? (
                <button
                  type="button"
                  onClick={() => onElegir(clave)}
                  aria-pressed={elegido}
                  aria-label={fechaLarga(clave)}
                  className={`size-11 rounded-full text-[15px] font-bold transition-colors ${
                    elegido ? "bg-noche text-white" : "bg-white text-noche hover:bg-linea"
                  }`}
                >
                  {dia}
                </button>
              ) : (
                <span className="text-[15px] text-gris-claro" aria-hidden="true">{dia}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
