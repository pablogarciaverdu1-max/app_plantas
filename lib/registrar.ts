import type { DatosCliente } from "@/lib/pedido";
import type { Plato } from "@/lib/platos";

export type PedidoCompleto = {
  platos: Plato[];
  fechaEntrega: string; // AAAA-MM-DD
  cliente: DatosCliente;
  creado: string; // ISO, fecha y hora del pedido
};

/**
 * Guarda el pedido y avisa por email. Si algo falla, lanza un error
 * y el cliente ve el aviso sin perder lo que había elegido.
 *
 * PENDIENTE: conectar el guardado y el email (paso 2). De momento
 * solo deja el pedido en el log del servidor.
 */
export async function registrarPedido(pedido: PedidoCompleto): Promise<void> {
  console.info("[pedido]", JSON.stringify(pedido));
}
