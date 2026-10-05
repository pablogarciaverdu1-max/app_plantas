import carta from "@/data/platos.json";

export type Plato = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  foto: string;
};

export const PLATOS: Plato[] = carta;

export const MAX_PLATOS = 5;

export function buscarPlato(id: string): Plato | undefined {
  return PLATOS.find((p) => p.id === id);
}
