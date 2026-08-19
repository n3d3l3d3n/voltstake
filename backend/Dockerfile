FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Persistent volume mount point for the SQLite DB (mapped in render.yaml)
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/voltstake.db

EXPOSE 4000
CMD ["node", "server.js"]
