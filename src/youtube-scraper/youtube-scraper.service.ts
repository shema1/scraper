import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

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
}
