import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoData } from '@/lib/video-fetcher';
import { addDocuments, clearCollection } from '@/lib/vector-db';

export async function POST(request: NextRequest) {
  try {
    const { videoAUrl, videoBUrl } = await request.json();

    if (!videoAUrl || !videoBUrl) {
      return NextResponse.json(
        { error: 'Both video URLs are required' },
        { status: 400 }
      );
    }

    // Clear previous collection
    await clearCollection();

    // Fetch video data
    const [videoA, videoB] = await Promise.all([
      fetchVideoData(videoAUrl),
      fetchVideoData(videoBUrl),
    ]);

    // Chunk transcripts and add to vector store
    const chunkSize = 500;
    const overlap = 50;

    console.log('Video A transcript length:', videoA.transcript?.length || 0);
    console.log('Video B transcript length:', videoB.transcript?.length || 0);

    const chunksA = chunkText(videoA.transcript || '', chunkSize, overlap);
    const chunksB = chunkText(videoB.transcript || '', chunkSize, overlap);

    console.log('Video A chunks:', chunksA.length);
    console.log('Video B chunks:', chunksB.length);

    const documentsA = chunksA.map((chunk, index) => ({
      pageContent: chunk,
      metadata: {
        videoId: 'A',
        videoUrl: videoA.url,
        platform: videoA.platform,
        chunkIndex: index,
        title: videoA.title,
        creator: videoA.creator,
        engagementRate: videoA.engagementRate,
        views: videoA.views,
        likes: videoA.likes,
        comments: videoA.comments,
      },
    }));

    const documentsB = chunksB.map((chunk, index) => ({
      pageContent: chunk,
      metadata: {
        videoId: 'B',
        videoUrl: videoB.url,
        platform: videoB.platform,
        chunkIndex: index,
        title: videoB.title,
        creator: videoB.creator,
        engagementRate: videoB.engagementRate,
        views: videoB.views,
        likes: videoB.likes,
        comments: videoB.comments,
      },
    }));

    const allDocuments = [...documentsA, ...documentsB];
    console.log('Total documents to add:', allDocuments.length);

    if (allDocuments.length === 0) {
      throw new Error('No documents to add - transcripts might be empty');
    }

    await addDocuments(allDocuments);

    return NextResponse.json({
      videoA: {
        ...videoA,
        transcript: undefined, // Don't send full transcript to client
      },
      videoB: {
        ...videoB,
        transcript: undefined,
      },
    });
  } catch (error) {
    console.error('Error processing videos:', error);
    return NextResponse.json(
      { error: 'Failed to process videos', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}
