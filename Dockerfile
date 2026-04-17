FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && \
    if [ -d "dist/src" ]; then \
        mv dist/src/* dist/ && \
        rmdir dist/src; \
    fi

FROM node:20
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Отладка: посмотрим, куда попал main.js
RUN ls -la dist/ && ls -la dist/src/ || true

# Если main.js лежит в dist/src, то запускаем оттуда
CMD ["node", "dist/src/main.js"]
