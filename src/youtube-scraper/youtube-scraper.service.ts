import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles } from 'youtube-caption-extractor';
import { GetVideoDetails } from 'youtube-search-api';
import { detect } from 'langdetect';
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
      const a = await GetVideoDetails(videoId);
      const langCode = detect(a?.title);
      const captions = await getSubtitles({
        videoID: videoId,
        lang: langCode[0]?.lang || 'en',
      });
      return captions;
    } catch (error) {
      throw new Error(`Failed to fetch captions: ${error.message}`);
    }
  }
}
