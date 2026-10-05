"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { botonPrincipal } from "@/components/estilos";
import { fechaLarga } from "@/lib/fechas";
import { acciones, useHidratado, usePedido } from "@/lib/store";

export default function Gracias() {
  const router = useRouter();
  const hidratado = useHidratado();
  const { confirmado } = usePedido();

  // Sin pedido confirmado no pintamos nada aquí: de vuelta al inicio.
  useEffect(() => {
    if (hidratado && !confirmado) router.replace("/");
  }, [hidratado, confirmado, router]);

  const resumen = confirmado
    ? `Has pedido ${confirmado.platos === 1 ? "1 plato" : `${confirmado.platos} platos`} para el ${fechaLarga(confirmado.fecha)}.`
    : "";

  function volver() {
    acciones.vaciar();
    router.push("/");
  }

  return (
    <main className="fondo-naranja min-h-dvh bg-naranja text-noche">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-6 pt-14 pb-8 text-center lg:max-w-xl lg:justify-center lg:pt-8">
        <div className="size-60 overflow-hidden rounded-full bg-white lg:size-72">
          <Image
            src="/mono-cocinero.webp"
            alt="Un monito con peto lila cocinando en una sartén"
            width={447}
            height={447}
            priority
            className="size-full object-cover"
          />
        </div>
        <p className="text-[13px] font-bold uppercase tracking-[2px]">Tu menú se está cocinando</p>
        <h1 className="font-titulo text-[52px] font-extrabold leading-[0.95] tracking-[-1.5px] lg:text-[72px]">
          ¡Oído cocina!
        </h1>
        <p className="text-[17px] font-medium leading-[1.45] lg:text-lg">
          Gracias por tu pedido. Ya hay alguien sudando entre fogones por ti, así que relájate: esta semana la sartén
          ni la mires.
        </p>
        <p className="text-[15px] font-bold">{resumen}</p>
        <button type="button" onClick={volver} className={`${botonPrincipal} mt-auto lg:mt-4 lg:w-fit lg:min-w-[300px]`}>
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
