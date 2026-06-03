'use client';

import { useState } from 'react';

interface VideoData {
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
  engagementRate?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function VideoAnalyzer() {
  const [videoAUrl, setVideoAUrl] = useState('');
  const [videoBUrl, setVideoBUrl] = useState('');
  const [videoA, setVideoA] = useState<VideoData | null>(null);
  const [videoB, setVideoB] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!videoAUrl || !videoBUrl) {
      setError('Please provide both video URLs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoAUrl, videoBUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to analyze videos');
      }

      const data = await response.json();
      setVideoA(data.videoA);
      setVideoB(data.videoB);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing videos. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantMessage += chunk;

          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === 'assistant') {
              lastMessage.content = assistantMessage;
            } else {
              newMessages.push({ role: 'assistant', content: assistantMessage });
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      setError('Error sending message. Please try again.');
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Video RAG Analyzer</h1>

        {/* Input Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Video A URL (YouTube/Instagram)</label>
              <input
                type="text"
                value={videoAUrl}
                onChange={(e) => setVideoAUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Video B URL (YouTube/Instagram)</label>
              <input
                type="text"
                value={videoBUrl}
                onChange={(e) => setVideoBUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            {loading ? 'Analyzing...' : 'Analyze Videos'}
          </button>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        {/* Video Cards */}
        {videoA && videoB && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <VideoCard video={videoA} label="Video A" />
            <VideoCard video={videoB} label="Video B" />
          </div>
        )}

        {/* Chat Section */}
        {videoA && videoB && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Chat with Video Analyst</h2>
            <div className="h-96 overflow-y-auto mb-4 bg-gray-700 rounded p-4">
              {messages.length === 0 ? (
                <p className="text-gray-400 text-center">Ask questions about the videos...</p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="text-left">
                  <div className="inline-block bg-gray-600 text-white p-3 rounded">
                    <p>Thinking...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about engagement, hooks, comparisons..."
                className="flex-1 px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={chatLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video, label }: { video: VideoData; label: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">{label}</h3>
      {video.thumbnail && (
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-40 object-cover rounded mb-3"
        />
      )}
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-gray-400">Title:</span> {video.title || 'N/A'}
        </p>
        <p>
          <span className="text-gray-400">Creator:</span> {video.creator || 'N/A'}
        </p>
        <p>
          <span className="text-gray-400">Platform:</span> {video.platform}
        </p>
        <p>
          <span className="text-gray-400">Views:</span>{' '}
          {video.views?.toLocaleString() || 'N/A'}
        </p>
        <p>
          <span className="text-gray-400">Likes:</span>{' '}
          {video.likes?.toLocaleString() || 'N/A'}
        </p>
        <p>
          <span className="text-gray-400">Comments:</span>{' '}
          {video.comments?.toLocaleString() || 'N/A'}
        </p>
        <p>
          <span className="text-gray-400">Engagement Rate:</span>{' '}
          {video.engagementRate?.toFixed(2) || 'N/A'}%
        </p>
        {video.hashtags && video.hashtags.length > 0 && (
          <p>
            <span className="text-gray-400">Hashtags:</span>{' '}
            {video.hashtags.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
