import { OpenAIEmbeddings } from '@langchain/openai';
import { CohereEmbeddings } from '@langchain/cohere';

const provider = process.env.EMBEDDING_PROVIDER || 'cohere';

let embeddings: any;

if (provider === 'openai') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
} else if (provider === 'cohere') {
  if (!process.env.COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not set. Get a free key at https://dashboard.cohere.com/api-keys');
  }
  embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: 'embed-english-v3.0',
  });
} else {
  throw new Error(`Unsupported embedding provider: ${provider}`);
}

interface StoredDocument {
  pageContent: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

const collections: Map<string, StoredDocument[]> = new Map();

export async function addDocuments(
  documents: Array<{ pageContent: string; metadata: Record<string, any> }>
) {
  if (!collections.has('videos')) {
    collections.set('videos', []);
  }

  const collection = collections.get('videos')!;

  // Generate embeddings for each document
  for (const doc of documents) {
    const embedding = await embeddings.embedQuery(doc.pageContent);
    collection.push({
      ...doc,
      embedding,
    });
  }
}

export async function queryDocuments(
  queryText: string,
  k: number = 5
) {
  const collection = collections.get('videos');
  if (!collection || collection.length === 0) {
    return [];
  }

  // Generate embedding for query
  const queryEmbedding = await embeddings.embedQuery(queryText);

  // Calculate cosine similarity for each document
  const similarities = collection.map(doc => {
    if (!doc.embedding) return { doc, score: 0 };
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    return { doc, score };
  });

  // Sort by similarity and return top k
  similarities.sort((a, b) => b.score - a.score);
  return similarities.slice(0, k).map(item => ({
    pageContent: item.doc.pageContent,
    metadata: item.doc.metadata,
  }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function clearCollection() {
  collections.delete('videos');
}

export function hasCollection(): boolean {
  return collections.has('videos');
}
