import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles } from 'youtube-caption-extractor';
import { GetVideoDetails } from 'youtube-search-api';
import { detect } from 'langdetect';
import { decode } from 'he';
import striptags from 'striptags';
import { exec } from 'child_process';
import { promisify } from 'util';

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

      console.log('langCode[0]?.lang ', langCode[0]?.lang);
      const captions = await getSubtitles({
        videoID: videoId,
        lang: 'en',
        // lang: langCode[0]?.lang || 'en',
      });
      return captions;
    } catch (error) {
      throw new Error(`Failed to fetch captions: ${error.message}`);
    }
  }

  async getCaptions2(videoID: string) {
    const a = await GetVideoDetails(videoID);
    const langCode = detect(a?.title);
    const lang = langCode[0]?.lang || 'en';
    console.log('lang', lang);
    // Fetch YouTube video page data
    const response = await fetch(`https://youtube.com/watch?v=${videoID}`);
    const data = await response.text();
    console.log('ssss', data.includes('captionTracks'));
    // Check if the video page contains captions
    if (!data.includes('captionTracks')) {
      console.warn(`No captions found for video: ${videoID}`);
      return `res 1`;
    }
    // Extract caption tracks JSON string from video page data
    const regex = /"captionTracks":(\[.*?\])/;
    const regexResult = regex.exec(data);
    if (!regexResult) {
      console.warn(`Failed to extract captionTracks from video: ${videoID}`);
      return `res2`;
    }
    const [_, captionTracksJson] = regexResult;
    const captionTracks = JSON.parse(captionTracksJson);
    console.log('captionTracks', captionTracks);
    // Find the appropriate subtitle language track
    const subtitle =
      captionTracks.find((track) => track.vssId === `.${lang}`) ||
      captionTracks.find((track) => track.vssId === `a.${lang}`) ||
      captionTracks.find(
        (track) => track.vssId && track.vssId.match(`.${lang}`),
      );
    // Check if the subtitle language track exists
    if (
      !(subtitle === null || subtitle === void 0 ? void 0 : subtitle.baseUrl)
    ) {
      console.warn(`Could not find ${lang} captions for ${videoID}`);
      return `res3 ${captionTracks}`;
    }
    // Fetch subtitles XML from the subtitle track URL
    const subtitlesResponse = await fetch(subtitle.baseUrl);
    const transcript = await subtitlesResponse.text();
    // Define regex patterns for extracting start and duration times
    const startRegex = /start="([\d.]+)"/;
    const durRegex = /dur="([\d.]+)"/;
    // Process the subtitles XML to create an array of subtitle objects
    const lines = transcript
      .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
      .replace('</transcript>', '')
      .split('</text>')
      .filter((line) => line && line.trim())
      .reduce((acc, line) => {
        // Extract start and duration times using regex patterns
        const startResult = startRegex.exec(line);
        const durResult = durRegex.exec(line);
        if (!startResult || !durResult) {
          console.warn(
            `Failed to extract start or duration from line: ${line}`,
          );
          return acc;
        }
        const [, start] = startResult;
        const [, dur] = durResult;
        // Clean up subtitle text by removing HTML tags and decoding HTML entities
        const htmlText = line
          .replace(/<text.+>/, '')
          .replace(/&amp;/gi, '&')
          .replace(/<\/?[^>]+(>|$)/g, '');
        const decodedText = decode(htmlText);
        // const text = striptags(decodedText);
        const text = decodedText;
        // Create a subtitle object with start, duration, and text properties
        acc.push({
          start,
          dur,
          text,
        });
        return acc;
      }, []);
    return { captionTracks, lines };
  }

  async getSubtitlesYtDlp(videoId: string, lang = 'en') {
    try {
      const { stdout } = await execAsync(
        `yt-dlp --write-sub --sub-lang ${lang} --skip-download --write-auto-sub https://www.youtube.com/watch?v=${videoId}`,
      );

      // Читаємо створений файл субтитрів
      const { stdout: subs } = await execAsync(`cat *.vtt`);

      // Видаляємо тимчасові файли
      await execAsync('rm *.vtt');

      return {
        subtitles: subs,
        info: stdout,
      };
    } catch (error) {
      throw new Error(`Failed to fetch subtitles: ${error.message}`);
    }
  }
}
