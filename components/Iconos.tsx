type Props = { size?: number; className?: string };

function Svg({ size = 20, className, children, grosor = 2.5 }: Props & { children: React.ReactNode; grosor?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const FlechaDerecha = (p: Props) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const FlechaIzquierda = (p: Props) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const Anterior = (p: Props) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const Siguiente = (p: Props) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const Check = (p: Props) => <Svg grosor={3} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const Cruz = (p: Props) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
