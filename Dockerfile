FROM node:18

# Встановлення необхідних залежностей для Chrome та Puppeteer
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
    chromium-sandbox \
    python3-full \
    python3-venv \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-glib-1-2 \
    libgbm-dev \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    xdg-utils

# Встановлення yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Створення та активація віртуального середовища Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Встановлення Python пакетів у віртуальному середовищі
RUN pip3 install browser-cookie3

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