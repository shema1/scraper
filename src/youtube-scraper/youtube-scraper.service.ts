import { Injectable } from '@nestjs/common';
import { youtube_v3 } from '@googleapis/youtube';
import axios from 'axios';
import { Buffer } from 'buffer';
import * as protobuf from 'protobufjs';

@Injectable()
export class YoutubeScraperService {
  private youtubeClient: youtube_v3.Youtube;

  constructor() {
    this.youtubeClient = new youtube_v3.Youtube({
      auth: process.env.YOUTUBE_API_KEY,
    });
  }

  async getSubtitles(videoUrl: string) {
    try {
      const videoId = this.extractVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const { language, trackKind } =
        await this.getDefaultSubtitleLanguage(videoId);
      return await this.fetchSubtitles({ videoId, language, trackKind });
    } catch (error) {
      throw new Error(`Failed to get subtitles: ${error.message}`);
    }
  }

  private async getDefaultSubtitleLanguage(videoId: string) {
    const videos = await this.youtubeClient.videos.list({
      part: ['snippet'],
      id: [videoId],
    });

    if (videos.data.items.length !== 1) {
      throw new Error(`Multiple videos found for video: ${videoId}`);
    }

    const preferredLanguage =
      videos.data.items[0].snippet.defaultLanguage ||
      videos.data.items[0].snippet.defaultAudioLanguage;

    const subtitles = await this.youtubeClient.captions.list({
      part: ['snippet'],
      videoId: videoId,
    });

    if (subtitles.data.items.length < 1) {
      throw new Error(`No subtitles found for video: ${videoId}`);
    }

    const { trackKind, language } = (
      subtitles.data.items.find(
        (sub) => sub.snippet.language === preferredLanguage,
      ) || subtitles.data.items[0]
    ).snippet;

    return { trackKind, language };
  }

  private async fetchSubtitles({ videoId, trackKind, language }) {
    const message = {
      param1: videoId,
      param2: this.getBase64Protobuf({
        param1: trackKind === 'asr' ? trackKind : null,
        param2: language,
      }),
    };

    const params = this.getBase64Protobuf(message);
    const url = 'https://www.youtube.com/youtubei/v1/get_transcript';
    const headers = { 'Content-Type': 'application/json' };
    const data = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240826.01.00',
        },
      },
      params,
    };

    const response = await axios.post(url, data, { headers });
    const initialSegments =
      response.data.actions[0].updateEngagementPanelAction.content
        .transcriptRenderer.content.transcriptSearchPanelRenderer.body
        .transcriptSegmentListRenderer.initialSegments;

    if (!initialSegments) {
      throw new Error(
        `Requested transcript does not exist for video: ${videoId}`,
      );
    }

    return initialSegments.map((segment) => {
      const line =
        segment.transcriptSectionHeaderRenderer ||
        segment.transcriptSegmentRenderer;

      return {
        startTime: parseInt(line.startMs) / 1000,
        endTime: parseInt(line.endMs) / 1000,
        text: this.extractText(line.snippet),
      };
    });
  }

  private getBase64Protobuf(message) {
    const root = protobuf.Root.fromJSON({
      nested: {
        Message: {
          fields: {
            param1: { id: 1, type: 'string' },
            param2: { id: 2, type: 'string' },
          },
        },
      },
    });
    const MessageType = root.lookupType('Message');
    const buffer = MessageType.encode(message).finish();
    return Buffer.from(buffer).toString('base64');
  }

  private extractText(item) {
    return item.simpleText || item.runs?.map((run) => run.text).join('');
  }

  private extractVideoId(url: string): string | null {
    try {
      const videoUrl = new URL(url);
      let videoId = null;

      if (videoUrl.hostname === 'www.youtube.com') {
        videoId = videoUrl.searchParams.get('v');
      } else if (videoUrl.hostname === 'youtu.be') {
        videoId = videoUrl.pathname.slice(1);
      }

      return videoId;
    } catch {
      return null;
    }
  }
}
