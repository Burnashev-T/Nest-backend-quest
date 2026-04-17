FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
# Если нет package-lock.json, используем npm install
RUN npm install
COPY . .
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/main.js"]
