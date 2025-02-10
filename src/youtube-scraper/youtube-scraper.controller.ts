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

  @Get('transcript')
  async getTranscript(@Query('videoId') videoId: string) {
    if (!videoId) {
      throw new Error('Video ID is required');
    }
    return this.youtubeScraperService.getTranscript(videoId);
  }

  @Get('captions')
  async getCaptions(@Query('videoId') videoId: string) {
    if (!videoId) {
      throw new Error('Video ID is required');
    }
    return this.youtubeScraperService.getCaptions(videoId);
  }
  @Get('captions2')
  async getCaptions2(@Query('videoId') videoId: string) {
    if (!videoId) {
      throw new Error('Video ID is required');
    }
    return this.youtubeScraperService.getCaptions2(videoId);
  }

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
