import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { YoutubeScraperModule } from './youtube-scraper/youtube-scraper.module';

@Module({
  imports: [YoutubeScraperModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
