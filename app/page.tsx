import Image from "next/image";
import Link from "next/link";
import { FlechaDerecha } from "@/components/Iconos";
import { botonNaranja } from "@/components/estilos";
import { PLATOS } from "@/lib/platos";

export default function Inicio() {
  return (
    <main className="min-h-dvh bg-noche text-white">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-7 py-8 md:max-w-xl lg:max-w-6xl lg:grid-cols-2 lg:gap-16 lg:px-12">
        <div className="flex flex-col gap-9 lg:gap-11">
          <div className="flex flex-col gap-[18px]">
            <div className="h-1.5 w-14 rounded-full bg-naranja" aria-hidden="true" />
            <h1 className="font-titulo text-[78px] font-extrabold leading-[0.9] tracking-[-2.5px] text-naranja lg:text-[128px] lg:tracking-[-4px]">
              VASTO
              <br />
              CUPADA
            </h1>
            <p className="font-titulo text-[26px] font-medium leading-[1.2] lg:text-[34px]">
              Así es, vas to ocupada. Déjate cocinar.
            </p>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex lg:hidden">
              {PLATOS.map((p, i) => (
                <Image
                  key={p.id}
                  src={p.foto}
                  alt={p.nombre}
                  width={56}
                  height={56}
                  className={`size-14 rounded-full border-[3px] border-noche object-cover ${i > 0 ? "-ml-3.5" : ""}`}
                />
              ))}
            </div>
            <p className="text-sm leading-[1.35] text-[#DCE1EC] lg:text-base">
              Hasta 5 platos distintos,
              <br />
              listos para toda la semana.
            </p>
          </div>

          <Link href="/platos" className={`${botonNaranja} w-full lg:w-fit lg:min-w-[300px]`}>
            Que cocine otro
            <FlechaDerecha />
          </Link>
        </div>

        <ul className="hidden grid-cols-2 gap-5 lg:grid" aria-label="Platos de esta semana">
          {PLATOS.slice(0, 4).map((p, i) => (
            <li key={p.id} className={i % 2 === 1 ? "translate-y-10" : ""}>
              <Image
                src={p.foto}
                alt={p.nombre}
                width={480}
                height={480}
                sizes="(min-width: 1024px) 28vw, 1px"
                priority
                className="aspect-square w-full rounded-full border-4 border-noche object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
