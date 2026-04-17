# Используем Node 20 Alpine
FROM node:20-alpine

# Создаём рабочую директорию
WORKDIR /app

# Сначала копируем только package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies), чтобы можно было сделать build
RUN npm ci

# Копируем весь код
COPY . .

# Собираем приложение
RUN npm run build

# Удаляем devDependencies, чтобы уменьшить размер образа
RUN npm prune --production

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/main.js"]
