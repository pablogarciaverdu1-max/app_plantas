import Link from "next/link";
import { FlechaIzquierda } from "@/components/Iconos";
import { botonRedondo } from "@/components/estilos";
import { MAX_PLATOS } from "@/lib/platos";

export function Contador({ n }: { n: number }) {
  return (
    <p aria-live="polite" className="rounded-full bg-naranja px-4 py-2.5 text-[15px] font-bold">
      {n} de {MAX_PLATOS} platos
    </p>
  );
}

export function Cabecera({ volverA, etiquetaVolver, n }: { volverA: string; etiquetaVolver: string; n: number }) {
  return (
    <div className="flex items-center justify-between">
      <Link href={volverA} aria-label={etiquetaVolver} className={botonRedondo}>
        <FlechaIzquierda />
      </Link>
      <Contador n={n} />
    </div>
  );
}
