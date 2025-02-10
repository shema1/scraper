import { Controller, Get, Query } from '@nestjs/common';
import { YoutubeScraperService } from './youtube-scraper.service';
@Controller('youtube-scraper')
export class YoutubeScraperController {
  constructor(private readonly youtubeScraperService: YoutubeScraperService) {}

  @Get('subtitles-ytdlp')
  async getSubtitlesYtDlp(
    @Query('videoId') videoId: string,
    @Query('lang') lang?: string,
  ) {
    if (!videoId) {
      throw new Error('Video ID is required');
    }
    return this.youtubeScraperService.getSubtitlesYtDlp(videoId, lang);
  }
}
