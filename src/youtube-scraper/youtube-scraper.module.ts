import { Module } from '@nestjs/common';
import { YoutubeScraperController } from './youtube-scraper.controller';
import { YoutubeScraperService } from './youtube-scraper.service';

@Module({
  controllers: [YoutubeScraperController],
  providers: [YoutubeScraperService],
})
export class YoutubeScraperModule {}
