import { NextRequest } from 'next/server';
import { queryDocuments } from '@/lib/vector-db';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

const llmProvider = process.env.LLM_PROVIDER || 'groq';

let llm: any;

if (llmProvider === 'openai') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  llm = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0.7,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
} else if (llmProvider === 'groq') {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys');
  }
  llm = new ChatGroq({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    streaming: true,
    apiKey: process.env.GROQ_API_KEY,
  });
} else {
  throw new Error(`Unsupported LLM provider: ${llmProvider}`);
}

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response('Invalid messages format', { status: 400 });
  }

  const latestMessage = messages[messages.length - 1];

  try {
    // Retrieve relevant documents from in-memory vector store
    const relevantDocs = await queryDocuments(latestMessage.content, 5);

    // Build context from retrieved documents with metadata
    const context = relevantDocs
      .map((doc) => {
        const metadata = doc.metadata || {};
        return `[Source: Video ${metadata.videoId}]
Title: ${metadata.title || 'N/A'}
Creator: ${metadata.creator || 'N/A'}
Engagement Rate: ${metadata.engagementRate ? metadata.engagementRate.toFixed(2) + '%' : 'N/A'}
Views: ${metadata.views || 'N/A'}
Likes: ${metadata.likes || 'N/A'}
Comments: ${metadata.comments || 'N/A'}

Transcript Chunk:
${doc.pageContent}`;
      })
      .join('\n\n---\n\n');

    // Create RAG chain with LangChain RunnableSequence
    const prompt = ChatPromptTemplate.fromTemplate(
      `You are a video content analyst helping creators compare and improve their videos. You have access to transcripts and metadata from two videos (Video A and Video B).

Use the following pieces of retrieved context to answer the question. Always cite your sources by mentioning which video (A or B) and what specific content you're referencing.

Context:
{context}

Question:
{input}

When comparing videos:
- Reference specific transcript segments
- Mention engagement metrics when relevant
- Provide actionable insights
- Be specific about what worked or didn't work

If you don't have enough information from the context, say so clearly.`
    );

    const ragChain = RunnableSequence.from([
      {
        context: () => context,
        input: (input: any) => input,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ragChain.stream(latestMessage.content);

          for await (const chunk of response) {
            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
