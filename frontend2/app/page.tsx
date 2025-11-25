'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import remarkGfm from 'remark-gfm';
import ThemeToggle from './components/ThemeToggle';
import LoadingSpinner from './components/LoadingSpinner';
import EmptyState from './components/EmptyState';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  last_modified: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading posts..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-50 dark:bg-base-900 flex items-center justify-center">
        <div className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm p-8 max-w-md">
          <div className="text-base-900 dark:text-base-100 text-lg font-medium mb-4">Error: {error}</div>
          <button 
            onClick={fetchPosts}
            className="px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-900">
      {/* Header */}
      <header className="bg-white dark:bg-base-800 border-b border-base-200 dark:border-base-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-base-900 dark:text-base-100 tracking-tight">
              Zlogg
            </h1>
            <div className="flex gap-2 items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Posts Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer"
              >
                {/* Header with title, metadata, and action buttons */}
                <div className="flex items-start gap-2 p-5 border-b border-base-200 dark:border-base-700">
                  <Link href={`/posts/${post.id}`} className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-base-900 dark:text-base-100 line-clamp-2 mb-2 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <time dateTime={post.created_at}>
                        {new Date(post.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </time>
                      {post.last_modified !== post.created_at && (
                        <>
                          <span>•</span>
                          <span>Updated</span>
                        </>
                      )}
                    </div>
                  </Link>
                 
                </div>

                {/* Content extract */}
                <Link href={`/posts/${post.id}`} className="flex-1 p-5">
                  <div className="text-slate-600 dark:text-slate-400 line-clamp-4 prose prose-sm max-w-none prose-slate dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {post.content}
                    </ReactMarkdown>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}