FROM node:22-alpine

WORKDIR /app

# Copiamos solo los manifiestos primero: si no cambian, Docker reutiliza la capa
# de dependencias y el build es casi instantáneo.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Sin root dentro del contenedor.
USER node

CMD ["node", "server.js"]
