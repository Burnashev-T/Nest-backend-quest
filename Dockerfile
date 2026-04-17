FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Отладка: показать, что внутри dist
RUN ls -la dist/ && (ls -la dist/src/ || true) && find dist -name "*.js"

# Если main.js лежит в dist/src/main.js, то запускаем оттуда
CMD ["node", "dist/src/main.js"]
