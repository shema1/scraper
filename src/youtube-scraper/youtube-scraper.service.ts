import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles } from 'youtube-caption-extractor';

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

  async getTranscript(videoId: string) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript;
    } catch (error) {
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }
  }

  async getCaptions(videoId: string): Promise<any[]> {
    try {
      const captions = await getSubtitles({
        videoID: videoId,
        lang: 'en', // можна змінити мову за потребою
      });
      return captions;
    } catch (error) {
      throw new Error(`Failed to fetch captions: ${error.message}`);
    }
  }
}
