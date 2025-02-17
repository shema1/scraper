import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class YoutubeScraperService {
  async fetchYouTubeHTML(videoUrl: string): Promise<string> {
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
    const page = await browser.newPage();
    await page.goto(videoUrl, { waitUntil: 'networkidle2' });
    const html = await page.content();
    await browser.close();
    return html;
  }

  async getAudioTranscription(videoUrl: string) {
    try {
      const videoId = this.extractVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Створюємо тимчасову директорію для файлів
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });

      // Отримуємо cookies через Puppeteer
      const cookiesPath = await this.getYoutubeCookies();

      // Скачуємо аудіо з використанням cookies
      const outputPath = path.join(tempDir, `${videoId}.mp3`);
      await execAsync(
        `yt-dlp -x --audio-format mp3 --cookies ${cookiesPath} -o "${outputPath}" ${videoUrl}`,
      );

      // Конвертуємо аудіо в текст використовуючи Whisper
      const { stdout: transcription } = await execAsync(
        `whisper "${outputPath}" --model small --language auto`,
      );

      // Видаляємо тимчасові файли
      await fs.unlink(outputPath);
      await fs.unlink(cookiesPath);

      return {
        videoId,
        transcription,
      };
    } catch (error) {
      throw new Error(`Failed to get transcription: ${error.message}`);
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
      ],
      headless: true,
      executablePath: '/usr/bin/chromium',
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      await page.goto('https://www.youtube.com', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await new Promise((r) => setTimeout(r, 5000));

      const cookies = await page.cookies();
      const cookiesPath = path.join(process.cwd(), 'cookies.txt');

      const formattedCookies = [
        '# Netscape HTTP Cookie File',
        '# https://curl.haxx.se/rfc/cookie_spec.html',
        '# This is a generated file!  Do not edit.',
        '',
        ...cookies.map((cookie) =>
          [
            cookie.domain || '.youtube.com',
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
      return cookiesPath;
    } finally {
      await browser.close();
    }
  }

  private extractVideoId(url: string): string | null {
    try {
      const videoUrl = new URL(url);
      let videoId = null;

      if (videoUrl.hostname === 'www.youtube.com') {
        videoId = videoUrl.searchParams.get('v');
      } else if (videoUrl.hostname === 'youtu.be') {
        videoId = videoUrl.pathname.slice(1);
      }

      return videoId;
    } catch {
      return null;
    }
  }
}
