import { validarPedido, type PedidoEntrante } from "@/lib/pedido";
import { buscarPlato, type Plato } from "@/lib/platos";
import { registrarPedido } from "@/lib/registrar";

// Todas las reglas se vuelven a comprobar aquí: lo que diga el navegador no cuenta.
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El pedido ha llegado ilegible." }, { status: 400 });
  }

  const b = (cuerpo ?? {}) as Partial<PedidoEntrante>;
  const c = (b.cliente ?? {}) as Partial<PedidoEntrante["cliente"]>;
  const entrante: PedidoEntrante = {
    platos: Array.isArray(b.platos) ? b.platos : [],
    fecha: typeof b.fecha === "string" ? b.fecha : null,
    cliente: {
      nombre: c.nombre as string,
      telefono: c.telefono as string,
      direccion: c.direccion as string,
      observaciones: c.observaciones ?? "",
    },
  };

  const error = validarPedido(entrante);
  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  try {
    await registrarPedido({
      platos: entrante.platos.map((id) => buscarPlato(id) as Plato),
      fechaEntrega: entrante.fecha as string,
      cliente: {
        nombre: entrante.cliente.nombre.trim(),
        telefono: entrante.cliente.telefono.trim(),
        direccion: entrante.cliente.direccion.trim(),
        observaciones: entrante.cliente.observaciones.trim(),
      },
      creado: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[pedido] no se pudo registrar", e);
    return Response.json(
      { error: "No hemos podido mandar tu pedido a cocina. Espera un momento." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
