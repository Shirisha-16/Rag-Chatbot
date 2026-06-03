import { YoutubeTranscript } from 'youtube-transcript';

export interface VideoMetadata {
  videoId: string;
  platform: 'youtube' | 'instagram';
  url: string;
  title?: string;
  views?: number;
  likes?: number;
  comments?: number;
  creator?: string;
  followerCount?: number;
  hashtags?: string[];
  uploadDate?: string;
  duration?: number;
  thumbnail?: string;
}

export interface VideoData extends VideoMetadata {
  transcript: string;
  engagementRate?: number;
}

function extractYouTubeId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function extractInstagramId(url: string): string | null {
  const regex = /instagram\.com\/(?:reel|p)\/([^\/?]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function fetchYouTubeMetadata(videoId: string): Promise<Partial<VideoMetadata>> {
  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY not set, using placeholder data');
    return {};
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      // Parse duration (PT4M30S -> 270 seconds)
      const durationMatch = contentDetails.duration.match(/PT(\d+M)?(\d+S)?/);
      let duration = 0;
      if (durationMatch) {
        const minutes = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
        const seconds = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
        duration = minutes * 60 + seconds;
      }

      return {
        title: snippet.title,
        creator: snippet.channelTitle,
        views: parseInt(statistics.viewCount) || 0,
        likes: parseInt(statistics.likeCount) || 0,
        comments: parseInt(statistics.commentCount) || 0,
        uploadDate: snippet.publishedAt,
        duration,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        hashtags: snippet.tags || [],
      };
    }
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
  }

  return {};
}

export async function fetchYouTubeVideoData(url: string): Promise<VideoData> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Fetch transcript
  let transcript = '';
  try {
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    transcript = transcriptData.map((item: { text: string }) => item.text).join(' ');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    transcript = 'Transcript not available';
  }

  // Fetch metadata using YouTube Data API v3
  let metadata: VideoMetadata = {
    videoId,
    platform: 'youtube',
    url,
  };

  const apiMetadata = await fetchYouTubeMetadata(videoId);
  metadata = { ...metadata, ...apiMetadata };

  // Fallback to placeholder data if API fails or not configured
  if (!metadata.views) {
    console.warn('YouTube API not configured or failed, using placeholder data for video:', videoId);
    metadata.views = Math.floor(Math.random() * 1000000) + 10000;
    metadata.likes = Math.floor(metadata.views * 0.05);
    metadata.comments = Math.floor(metadata.views * 0.001);
    metadata.hashtags = ['#viral', '#trending', '#fyp'];
    metadata.uploadDate = new Date().toISOString();
    metadata.duration = Math.floor(Math.random() * 600) + 60;
    metadata.title = 'YouTube Video (Placeholder Data)';
    metadata.creator = 'YouTube Creator (Placeholder)';
  }

  const engagementRate = calculateEngagementRate(
    metadata.likes || 0,
    metadata.comments || 0,
    metadata.views || 1
  );

  return {
    ...metadata,
    transcript,
    engagementRate,
  };
}

async function fetchInstagramMetadata(mediaId: string): Promise<Partial<VideoMetadata>> {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.warn('INSTAGRAM_ACCESS_TOKEN not set, using placeholder data');
    return {};
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/${mediaId}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
    );
    const data = await response.json();

    if (data.error) {
      console.error('Instagram API error:', data.error);
      return {};
    }

    return {
      title: data.caption || 'Instagram Reel',
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      uploadDate: data.timestamp,
      thumbnail: data.thumbnail_url || data.media_url,
    };
  } catch (error) {
    console.error('Error fetching Instagram metadata:', error);
  }

  return {};
}

export async function fetchInstagramVideoData(url: string): Promise<VideoData> {
  const videoId = extractInstagramId(url);
  if (!videoId) {
    throw new Error('Invalid Instagram URL');
  }

  // Fetch metadata using Instagram Basic Display API
  let metadata: VideoMetadata = {
    videoId,
    platform: 'instagram',
    url,
  };

  const apiMetadata = await fetchInstagramMetadata(videoId);
  metadata = { ...metadata, ...apiMetadata };

  // Fallback to placeholder data if API fails or not configured
  if (!metadata.views) {
    console.warn('Instagram API not configured or failed, using placeholder data for video:', videoId);
    metadata.views = Math.floor(Math.random() * 500000) + 5000;
    metadata.likes = metadata.likes || Math.floor(metadata.views * 0.08);
    metadata.comments = metadata.comments || Math.floor(metadata.views * 0.002);
    metadata.creator = 'Instagram Creator (Placeholder)';
    metadata.followerCount = Math.floor(Math.random() * 100000) + 1000;
    metadata.hashtags = ['#reels', '#viral', '#explore'];
    metadata.uploadDate = metadata.uploadDate || new Date().toISOString();
    metadata.duration = Math.floor(Math.random() * 90) + 15;
    metadata.title = 'Instagram Reel (Placeholder Data)';
  }

  // Placeholder transcript for Instagram (would need audio processing)
  const transcript = 'Instagram transcript would require audio processing. For this demo, this is placeholder text representing the video content.';

  const engagementRate = calculateEngagementRate(
    metadata.likes || 0,
    metadata.comments || 0,
    metadata.views || 1
  );

  return {
    ...metadata,
    transcript,
    engagementRate,
  };
}

export function calculateEngagementRate(
  likes: number,
  comments: number,
  views: number
): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

export async function fetchVideoData(url: string): Promise<VideoData> {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return fetchYouTubeVideoData(url);
  } else if (url.includes('instagram.com')) {
    return fetchInstagramVideoData(url);
  } else {
    throw new Error('Unsupported video platform. Only YouTube and Instagram are supported.');
  }
}
