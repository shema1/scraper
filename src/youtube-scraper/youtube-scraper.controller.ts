import { Controller, Query, Body, Post } from '@nestjs/common';
import { YoutubeScraperService } from './youtube-scraper.service';

interface YouTubeCredentials {
  email: string;
  password: string;
}

@Controller('youtube-scraper')
export class YoutubeScraperController {
  constructor(private readonly youtubeScraperService: YoutubeScraperService) {}

  @Post('fetch')
  async fetchVideo(
    @Query('url') videoUrl: string,
    @Body() credentials?: YouTubeCredentials,
  ): Promise<string> {
    if (!videoUrl) {
      throw new Error('URL is required');
    }
    return this.youtubeScraperService.fetchYouTubeHTML(videoUrl, credentials);
  }
}
