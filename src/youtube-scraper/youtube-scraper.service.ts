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
      ],
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2' });

      const cookies = await page.cookies();
      const cookiesPath = path.join(process.cwd(), 'cookies.txt');

      const formattedCookies = cookies
        .map((cookie) => `${cookie.name}\t${cookie.value}`)
        .join('\n');

      await fs.writeFile(cookiesPath, formattedCookies);

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
