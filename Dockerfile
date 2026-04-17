FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies для сборки)
RUN npm ci

# Копируем весь исходный код
COPY . .

# Собираем TypeScript в JavaScript
RUN npm run build

# Удаляем devDependencies, чтобы уменьшить размер образа
RUN npm prune --production

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/main.js"]
