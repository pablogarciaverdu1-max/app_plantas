# VASTOCUPADA · pedidos

Web app de pedidos de platos para toda la semana. Next.js (App Router) + TypeScript + Tailwind.

Pantallas: Inicio (`/`) → Platos (`/platos`) → Resumen (`/pedido`) → Gracias (`/gracias`).
El pedido se envía a `POST /api/pedido`, que vuelve a comprobar todas las reglas
(máximo 5 platos, sin repetir, platos que existen en la carta, entrega a partir de
mañana en hora de Madrid, datos obligatorios).

## Arrancar en local

```bash
npm install
npm run dev        # http://localhost:3000
```

## Cambiar la carta de la semana

Todo está en **`data/platos.json`**. Cada plato:

```json
{
  "id": "berenjena",
  "categoria": "Verdura",
  "nombre": "Berenjena rellena",
  "descripcion": "Tan rellena que no le cabe ni una excusa para pedir pizza.",
  "foto": "/platos/berenjena.webp"
}
```

1. Sube la foto a `public/platos/` (mejor cuadrada, ~800 px, en `.webp` o `.jpg`).
2. Añade, quita o edita platos en `data/platos.json`. El `id` debe ser único, en
   minúsculas y sin espacios (por ejemplo `pollo-al-curry`).
3. Guarda, haz commit y push: Vercel vuelve a desplegar solo.

No hace falta tocar nada más. Si un cliente tenía elegido un plato que ya has quitado,
la app se lo quita del pedido sin romperse.

## Desplegar en Vercel

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. *Add New → Project* e importa este repositorio.
3. Deja la configuración que detecta (Next.js) y pulsa *Deploy*.
4. Comparte con tus clientes la URL que te da (o conecta tu dominio en *Settings → Domains*).

## Pendiente

Guardar el pedido y enviar el email de aviso: de momento `lib/registrar.ts` solo
deja el pedido en los logs del servidor (en Vercel: *Project → Logs*).
