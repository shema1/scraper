FROM node:18

# Встановлення необхідних залежностей для Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libxtst6 \
    libgbm-dev \
    libasound2 \
    chromium \
    chromium-sandbox

# Встановлення робочої директорії
WORKDIR /app

# Копіювання package.json та package-lock.json
COPY package*.json ./

# Встановлення залежностей
RUN npm install

# Копіювання коду проекту
COPY . .

# Збірка проекту
RUN npm run build

# Відкриття порту
EXPOSE 3000

# Запуск додатку
CMD ["npm", "run", "start:prod"] 