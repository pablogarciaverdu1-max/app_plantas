"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cabecera } from "@/components/Cabecera";
import { Calendario } from "@/components/Calendario";
import { Cruz } from "@/components/Iconos";
import { botonPrincipal, botonRedondo, botonSecundario, tituloPantalla } from "@/components/estilos";
import { esFechaEntregable } from "@/lib/fechas";
import { type DatosCliente, datosCompletos, telefonoValido } from "@/lib/pedido";
import { buscarPlato } from "@/lib/platos";
import { acciones, useHidratado, usePedido } from "@/lib/store";

const campo =
  "w-full rounded-2xl border-2 border-borde bg-white px-4 text-base text-noche placeholder:text-gris-claro focus:border-noche";

export default function Resumen() {
  const router = useRouter();
  const hidratado = useHidratado();
  const { platos, fecha: fechaGuardada, cliente } = usePedido();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tocado, setTocado] = useState<Partial<Record<keyof DatosCliente, boolean>>>({});

  useEffect(() => {
    acciones.limpiarPlatos((id) => !!buscarPlato(id));
  }, []);

  // Un día que ya ha pasado (pedido a medias de otro día) no cuenta.
  const fecha = hidratado && fechaGuardada && esFechaEntregable(fechaGuardada) ? fechaGuardada : null;
  const n = platos.length;
  const datosOk = datosCompletos(cliente);
  const puedePedir = n > 0 && !!fecha && datosOk && !enviando;

  const textoBoton = enviando
    ? "Mandando a cocina…"
    : n === 0
      ? "Elige al menos un plato"
      : !fecha
        ? "Elige el día de entrega"
        : !datosOk
          ? "Rellena tus datos"
          : "Pedir menú semanal";

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    if (!puedePedir || !fecha) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platos, fecha, cliente }),
      });
      const datos = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(datos.error ?? "La cocina no ha contestado bien.");
      }
      acciones.confirmar(n, fecha);
      router.push("/gracias");
    } catch (err) {
      const detalle =
        err instanceof TypeError
          ? "No hemos podido conectar con la cocina. Revisa tu conexión."
          : err instanceof Error
            ? err.message
            : "Algo se ha quemado por el camino.";
      setError(`${detalle} Tu pedido sigue aquí tal cual: vuelve a intentarlo.`);
      setEnviando(false);
    }
  }

  const avisoError = error && (
    <p role="alert" className="mb-3 rounded-2xl border-2 border-[#B42318] bg-[#FEF3F2] px-4 py-3 text-sm font-medium text-[#7A271A]">
      {error}
    </p>
  );

  const botonPedir = (
    <button type="submit" form="form-pedido" disabled={!puedePedir} className={botonPrincipal}>
      {textoBoton}
    </button>
  );

  const telefonoMal = tocado.telefono && cliente.telefono.trim() !== "" && !telefonoValido(cliente.telefono);

  return (
    <div className="mx-auto max-w-xl pb-40 lg:max-w-6xl lg:px-10 lg:py-10 lg:pb-10">
      <div className="flex flex-col gap-3.5 px-5 pt-5 pb-4 lg:px-0 lg:pt-0 lg:pb-8">
        <Cabecera volverA="/platos" etiquetaVolver="Volver a los platos" n={n} />
        <div className="flex flex-col gap-1.5">
          <h1 className={tituloPantalla}>Tu pedido</h1>
          <p className="text-[15px] leading-[1.4] lg:text-lg">Repasa tu menú antes de mandarlo a cocina.</p>
        </div>
      </div>

      <div className="grid gap-5 px-5 [grid-template-areas:'platos'_'calendario'_'datos'] lg:grid-cols-[1fr_400px] lg:gap-x-10 lg:gap-y-8 lg:px-0 lg:[grid-template-areas:'platos_calendario'_'datos_calendario'] lg:grid-rows-[auto_1fr]">
        <section aria-label="Platos elegidos" className="flex flex-col [grid-area:platos]">
          {n === 0 ? (
            <p className="border-t-2 border-noche py-8 text-base leading-normal">
              Aquí no hay nada todavía. Tu nevera te está mirando con preocupación.
            </p>
          ) : (
            <ol>
              {platos.map((id, i) => {
                const p = buscarPlato(id);
                if (!p) return null;
                return (
                  <li key={id} className="flex items-center gap-3.5 border-t-2 border-noche py-3.5">
                    <span className="w-7 shrink-0 font-titulo text-lg font-bold">{String(i + 1).padStart(2, "0")}</span>
                    <Image src={p.foto} alt={p.nombre} width={120} height={120} className="size-[60px] shrink-0 rounded-xl object-cover lg:size-[72px]" />
                    <span className="min-w-0 grow font-titulo text-[17px] font-bold leading-[1.2] lg:text-lg">{p.nombre}</span>
                    <button type="button" onClick={() => acciones.quitarPlato(id)} aria-label={`Quitar ${p.nombre}`} className={botonRedondo}>
                      <Cruz size={18} />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/platos" className={`${botonSecundario} mt-2`}>
            Añadir o cambiar platos
          </Link>
        </section>

        <div className="[grid-area:calendario] lg:sticky lg:top-10 lg:self-start">
          {hidratado ? (
            <Calendario valor={fecha} onElegir={acciones.elegirFecha} />
          ) : (
            <div className="h-[420px] rounded-[20px] bg-bruma lg:rounded-[28px]" />
          )}
          <div className="mt-5 hidden lg:block">
            {avisoError}
            {botonPedir}
          </div>
        </div>

        <form
          id="form-pedido"
          onSubmit={pedir}
          noValidate
          aria-labelledby="titulo-datos"
          className="flex flex-col gap-4 rounded-[20px] bg-bruma p-4 [grid-area:datos] lg:rounded-[28px] lg:p-6"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="titulo-datos" className="font-titulo text-xl font-bold leading-[1.2] lg:text-2xl">
              ¿A quién se lo llevamos?
            </h2>
            <p className="text-sm font-medium">Lo justo para que el táper llegue a buen puerto.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className="text-sm font-bold">Nombre</label>
            <input
              id="nombre" name="nombre" autoComplete="name" required maxLength={100}
              value={cliente.nombre}
              onChange={(e) => acciones.cambiarCliente("nombre", e.target.value)}
              placeholder="Cómo te llamamos"
              className={`${campo} h-[52px]`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefono" className="text-sm font-bold">Teléfono</label>
            <input
              id="telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20}
              value={cliente.telefono}
              onChange={(e) => acciones.cambiarCliente("telefono", e.target.value)}
              onBlur={() => setTocado((t) => ({ ...t, telefono: true }))}
              aria-invalid={telefonoMal || undefined}
              aria-describedby={telefonoMal ? "telefono-error" : undefined}
              placeholder="600 000 000"
              className={`${campo} h-[52px]`}
            />
            {telefonoMal && (
              <p id="telefono-error" className="text-sm font-medium text-[#B42318]">
                Ese teléfono no cuadra. Mínimo 9 cifras, sin trampas.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="direccion" className="text-sm font-bold">Dirección de entrega</label>
            <input
              id="direccion" name="direccion" autoComplete="street-address" required maxLength={300}
              value={cliente.direccion}
              onChange={(e) => acciones.cambiarCliente("direccion", e.target.value)}
              placeholder="Calle, número, piso y puerta"
              className={`${campo} h-[52px]`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="observaciones" className="text-sm font-bold">
              Observaciones <span className="font-medium text-gris">(opcional)</span>
            </label>
            <textarea
              id="observaciones" name="observaciones" rows={3} maxLength={500}
              value={cliente.observaciones}
              onChange={(e) => acciones.cambiarCliente("observaciones", e.target.value)}
              placeholder="Alergias, timbre que no suena, el perro no muerde…"
              className={`${campo} resize-y py-3`}
            />
          </div>
        </form>
      </div>

      {/* Móvil: botón fijo abajo */}
      <div className="fixed inset-x-0 bottom-0 border-t border-linea bg-white px-5 pt-3.5 pb-[max(28px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-xl">
          {avisoError}
          {botonPedir}
        </div>
      </div>
    </div>
  );
}
