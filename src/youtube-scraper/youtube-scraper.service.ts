import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as url from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import puppeteer from 'puppeteer';

const execAsync = promisify(exec);

@Injectable()
export class YoutubeScraperService {
  async getSubtitlesYtDlp(videoUrl: string, lang = 'en') {
    try {
      const videoId = this.extractVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      const cookiesPath = await this.getYoutubeCookies();

      const { stdout } = await execAsync(
        `yt-dlp --cookies ${cookiesPath} --write-sub --sub-lang ${lang} --skip-download --write-auto-sub https://www.youtube.com/watch?v=${videoId}`,
      );

      const { stdout: subs } = await execAsync(`cat *.vtt`);
      await execAsync('rm *.vtt');

      await fs.unlink(cookiesPath);

      return {
        subtitles: subs,
        info: stdout,
      };
    } catch (error) {
      if (error.message.includes("confirm you're not a bot")) {
        throw new Error(
          'YouTube requires authentication. Please try again later or use a different method.',
        );
      }
      throw new Error(`Failed to fetch subtitles: ${error.message}`);
    }
  }

  private async getYoutubeCookies(): Promise<string> {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      ],
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Встановлюємо додаткові заголовки
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Емулюємо затримку введення як реальний користувач
      await page.goto('https://www.youtube.com', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Чекаємо трохи, щоб YouTube "повірив" що ми реальний користувач
      await new Promise((r) => setTimeout(r, 5000));

      // Скролимо сторінку як реальний користувач
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });

      await new Promise((r) => setTimeout(r, 2000));

      const cookies = await page.cookies();
      const cookiesPath = path.join(process.cwd(), 'cookies.txt');

      // Форматуємо cookies у форматі Netscape
      const formattedCookies = [
        '# Netscape HTTP Cookie File',
        '# https://curl.haxx.se/rfc/cookie_spec.html',
        '# This is a generated file!  Do not edit.',
        '',
        ...cookies.map((cookie) =>
          [
            cookie.domain || '.youtube.com', // використовуємо оригінальний домен cookie
            'TRUE',
            cookie.path,
            cookie.secure.toString().toUpperCase(),
            Math.floor(cookie.expires || Date.now() / 1000 + 365 * 24 * 3600),
            cookie.name,
            cookie.value,
          ].join('\t'),
        ),
      ].join('\n');

      await fs.writeFile(cookiesPath, formattedCookies);

      // Виводимо cookies для дебагу
      console.log('Cookies saved:', cookies.length);
      console.log('First cookie example:', cookies[0]);

      return cookiesPath;
    } finally {
      await browser.close();
    }
  }

  private extractVideoId(videoUrl: string): string | null {
    try {
      const parsedUrl = new url.URL(videoUrl);
      if (
        parsedUrl.hostname !== 'www.youtube.com' &&
        parsedUrl.hostname !== 'youtu.be'
      ) {
        return null;
      }

      if (parsedUrl.hostname === 'www.youtube.com') {
        return parsedUrl.searchParams.get('v');
      }

      if (parsedUrl.hostname === 'youtu.be') {
        return parsedUrl.pathname.substring(1);
      }

      return null;
    } catch {
      return null;
    }
  }
}
