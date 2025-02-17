import { Controller, Get, Query } from '@nestjs/common';
import { YoutubeScraperService } from './youtube-scraper.service';

@Controller('youtube-scraper')
export class YoutubeScraperController {
  constructor(private readonly youtubeScraperService: YoutubeScraperService) {}

  @Get('fetch')
  async fetchVideo(@Query('url') videoUrl: string): Promise<string> {
    if (!videoUrl) {
      throw new Error('URL is required');
    }
    return this.youtubeScraperService.fetchYouTubeHTML(videoUrl);
  }

  @Get('subtitles')
  async getSubtitles(@Query('url') videoUrl: string) {
    if (!videoUrl) {
      throw new Error('URL is required');
    }
    return this.youtubeScraperService.getSubtitles(videoUrl);
  }
}
