# RAG Video Chatbot

A full-stack RAG (Retrieval-Augmented Generation) chatbot that analyzes social media videos (YouTube and Instagram Reels) to help creators compare and improve their content.

## Features

- **Video Analysis**: Analyze two social media videos simultaneously
- **Transcript Processing**: Fetch and chunk video transcripts for RAG
- **Metadata Extraction**: Extract views, likes, comments, engagement rates
- **AI-Powered Chat**: Ask questions about videos with streaming responses
- **Source Citations**: Responses cite specific video segments
- **Memory**: Maintains conversation context
- **Free API Stack**: Uses Groq (LLM) and Cohere (embeddings) free tiers

## Tech Stack

- **Frontend**: Next.js 14 (React + Server Components)
- **Backend**: Next.js API Routes (Node.js)
- **Orchestration**: LangChain (RunnableSequence)
- **LLM**: Groq API (Llama 3.3 - Free)
- **Embeddings**: Cohere embed-english-v3.0 (Free tier)
- **Vector Database**: In-memory (production: ChromaDB/Qdrant)
- **Transcript Fetching**: youtube-transcript-api (free)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- API keys for Groq and Cohere (free)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd rag-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# LLM Provider (Groq is free)
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here

# Embedding Provider (Cohere has free tier)
EMBEDDING_PROVIDER=cohere
COHERE_API_KEY=your_cohere_api_key_here

# Optional: YouTube Data API v3 (free)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Optional: Instagram Basic Display API (free)
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
```

### Getting API Keys

#### Groq API Key (Free)
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up for free account
3. Go to API Keys section
4. Create and copy your API key

#### Cohere API Key (Free Tier)
1. Go to [Cohere Dashboard](https://dashboard.cohere.com/)
2. Sign up for free account
3. Go to API Keys section
4. Create and copy your API key

#### YouTube Data API v3 (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API Key)
5. Copy your API key

#### Instagram Basic Display API (Optional)
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Instagram Basic Display product
4. Generate access token

### Running the Application

```bash
npm run dev```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Enter Video URLs**: Paste YouTube and Instagram Reel URLs
2. **Analyze**: Click "Analyze Videos" to process
3. **Chat**: Ask questions about the videos
4. **Compare**: Get insights on engagement, content, and performance

## Project Structure

```
rag-chatbot/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts       # Chat API endpoint
│   │   │   └── videos/
│   │   │       └── route.ts       # Video processing API
│   │   └── page.tsx               # Main page
│   ├── components/
│   │   └── VideoAnalyzer.tsx     # Main UI component
│   └── lib/
│       ├── vector-db.ts           # Vector database (in-memory)
│       └── video-fetcher.ts       # Video data fetching
├── .env.local                     # Environment variables (not committed)
├── .env.example                   # Environment variables template
├── COST_ANALYSIS.md               # Detailed cost analysis
└── README.md                      # This file
```

## Cost Analysis

This project uses free APIs to minimize costs:
- **Groq API**: Free during beta (unlimited requests)
- **Cohere Embeddings**: Free tier (1,000 calls/month)
- **Total Cost**: $0/day for development/testing

For detailed cost analysis and production scaling, see [COST_ANALYSIS.md](./COST_ANALYSIS.md).

## Architecture

### RAG Pipeline

1. **Video Processing**: Fetch transcripts and metadata from video URLs
2. **Chunking**: Split transcripts into 500-character chunks with 50-character overlap
3. **Embedding**: Generate embeddings using Cohere
4. **Vector Storage**: Store in in-memory vector database (production: ChromaDB)
5. **Retrieval**: Query vector database for relevant chunks
6. **Generation**: Use LangChain RunnableSequence with Groq LLM
7. **Streaming**: Stream responses back to client

### LangChain Orchestration

- Uses `RunnableSequence` for RAG chain composition
- `ChatPromptTemplate` for prompt engineering
- `StringOutputParser` for response formatting
- Supports multiple LLM providers (Groq, OpenAI, Gemini)

## Production Considerations

### Current Limitations

- **In-Memory Vector DB**: Data lost on server restart
- **Free API Rate Limits**: May hit limits at scale
- **Single Server**: No horizontal scaling

### Production Upgrades

- **Vector Database**: Upgrade to ChromaDB (self-hosted) or Qdrant Cloud
- **API Fallback**: Implement fallback to paid APIs (OpenAI, Anthropic)
- **Caching**: Add Redis for caching embeddings and responses
- **Queue System**: Use BullMQ for async video processing
- **Load Balancing**: Deploy multiple instances behind load balancer

## Troubleshooting

### API Key Errors
- Ensure all required API keys are in `.env.local`
- Verify keys are valid and not expired
- Check API key permissions

### Video Processing Errors
- Ensure video URLs are valid and accessible
- Check if YouTube/Instagram API keys are configured (for real metadata)
- Without API keys, placeholder data will be used

### Embedding Errors
- Verify Cohere API key is valid
- Check if within free tier limits
- Consider upgrading to paid tier if limits exceeded

## Challenges Faced

### 1. ChromaDB Integration Issues
**Problem**: Initial attempts to use ChromaDB Cloud failed due to connection errors and unclear documentation on how to obtain the Cloud URL.

**Solution**: Implemented a temporary in-memory vector store using a custom Map-based implementation with cosine similarity for document retrieval. This allowed development to continue while exploring alternatives.

### 2. Data Accuracy and Context Issues
**Problem**: The chatbot was providing "incorrect data" and couldn't answer questions about engagement rates or other metadata.

**Solution**: 
- Enhanced the context sent to the LLM to include all relevant metadata (views, likes, comments, engagement rate, title, creator)
- Added clear warnings and visual cues when placeholder data is used due to missing API keys
- Improved the RAG prompt to explicitly instruct the LLM to cite sources and reference specific metrics

### 3. API Key Acquisition
**Problem**: User needed detailed instructions on how to obtain YouTube and Instagram API keys.

**Solution**: Added comprehensive guides in the README for:
- YouTube Data API v3 setup via Google Cloud Console
- Instagram Basic Display API setup via Facebook Developers
- Groq and Cohere API key generation

### 4. Pinecone Integration Errors
**Problem**: Multiple persistent errors when attempting to integrate Pinecone as the persistent vector database:
- `TypeError: index.delete is not a function`
- `TypeError: indexes.some is not a function`
- `Error: Must pass in at least 1 record to upsert`

**Attempted Solutions**:
- Fixed API method calls (delete vs deleteMany)
- Updated listIndexes response handling
- Corrected PineconeStore.fromDocuments parameters
- Switched to direct Pinecone client upsert instead of LangChain wrapper

**Final Resolution**: Due to persistent API compatibility issues, reverted to the in-memory vector store solution. This provides a working solution for development and testing. For production, ChromaDB (self-hosted) or Qdrant Cloud are recommended alternatives.

### 5. LangChain Orchestration
**Problem**: Needed to implement proper LangChain orchestration using modern patterns.

**Solution**: Implemented LangChain's LCEL (LangChain Expression Language) with:
- `RunnableSequence` for RAG chain composition
- `ChatPromptTemplate` for prompt engineering
- `StringOutputParser` for response formatting
- Proper retriever integration for document retrieval

### Lessons Learned

1. **Start Simple**: In-memory solutions are often sufficient for development and testing
2. **API Compatibility**: Different API versions and SDKs can have breaking changes - always check documentation
3. **Free Tier Limitations**: Free APIs have rate limits that may not be suitable for production scaling
4. **Error Handling**: Robust error handling and fallback strategies are essential for production systems
5. **Documentation**: Clear documentation for API key setup and configuration is critical for onboarding


## Acknowledgments

- [LangChain](https://langchain.com/) - LLM orchestration framework
- [Groq](https://groq.com/) - Fast LLM inference
- [Cohere](https://cohere.com/) - Embeddings API
- [Next.js](https://nextjs.org/) - React framework
