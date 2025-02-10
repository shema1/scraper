import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class YoutubeScraperService {
  async fetchYouTubeHTML(
    videoUrl: string,
    credentials?: { email: string; password: string },
  ): Promise<string> {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
      executablePath: '/usr/bin/chromium',
    });

    try {
      const page = await browser.newPage();

      // Якщо передані облікові дані, виконуємо логін
      if (credentials) {
        // Переходимо на сторінку логіну Google
        await page.goto('https://accounts.google.com/signin');

        // Вводимо email
        await page.type('input[type="email"]', credentials.email);
        await page.click('#identifierNext');

        // Чекаємо появи поля для пароля
        await page.waitForSelector('input[type="password"]', { visible: true });

        // Вводимо пароль
        await page.type('input[type="password"]', credentials.password);
        await page.click('#passwordNext');

        // Чекаємо завершення авторизації
        await page.waitForNavigation();
      }

      // Переходимо на сторінку відео
      await page.goto(videoUrl, { waitUntil: 'networkidle2' });
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }
}
