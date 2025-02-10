import { Controller, Get, Query } from '@nestjs/common';
import { YoutubeScraperService } from './youtube-scraper.service';
@Controller('youtube-scraper')
export class YoutubeScraperController {
  constructor(private readonly youtubeScraperService: YoutubeScraperService) {}

  @Get('subtitles-ytdlp')
  async getSubtitlesYtDlp(
    @Query('videoUrl') videoUrl: string,
    @Query('lang') lang?: string,
  ) {
    if (!videoUrl) {
      throw new Error('Video ID is required');
    }
    return this.youtubeScraperService.getSubtitlesYtDlp(videoUrl, lang);
  }
}
