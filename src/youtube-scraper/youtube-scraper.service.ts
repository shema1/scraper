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

      // Скачуємо аудіо
      const outputPath = path.join(tempDir, `${videoId}.mp3`);
      await execAsync(
        `yt-dlp -x --audio-format mp3 -o "${outputPath}" ${videoUrl}`,
      );

      // Конвертуємо аудіо в текст використовуючи Whisper
      const { stdout: transcription } = await execAsync(
        `whisper "${outputPath}" --model small --language auto`,
      );

      // Видаляємо тимчасові файли
      await fs.unlink(outputPath);

      return {
        videoId,
        transcription,
      };
    } catch (error) {
      throw new Error(`Failed to get transcription: ${error.message}`);
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
