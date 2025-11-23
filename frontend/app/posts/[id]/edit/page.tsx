'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownEditor from '../../../components/MarkdownEditor';
import { parseMarkdown, combineToMarkdown } from '../../../utils/markdown';
import ThemeToggle from '../../../components/ThemeToggle';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  last_modified: string;
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [editedPostContent, setEditedPostContent] = useState('# ');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (params.id) {
      fetchPost(params.id as string);
    }
  }, [params.id]);

  const fetchPost = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/posts/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post not found');
        }
        throw new Error('Failed to fetch post');
      }
      const data = await response.json();
      setPost(data.data);
      // Combine title and content into markdown format
      setEditedPostContent(combineToMarkdown(data.data.title, data.data.content));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!post) return;
    
    const { title, content } = parseMarkdown(editedPostContent);
    
    if (!title.trim()) {
      toast.error('Please enter a title for your post');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${API_URL}/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) throw new Error('Failed to update post');
      
      toast.success('Post updated successfully');
      router.push(`/posts/${post.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-50 dark:bg-base-900 flex items-center justify-center">
        <div className="text-lg text-slate-600 dark:text-slate-400 font-medium">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-base-50 dark:bg-base-900 flex items-center justify-center">
        <div className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm p-8 max-w-md">
          <div className="text-base-900 dark:text-base-100 text-lg font-medium mb-4">{error || 'Post not found'}</div>
          <Link 
            href="/"
            className="inline-block px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-900">
      {/* Header */}
      <header className="bg-white dark:bg-base-800 border-b border-base-200 dark:border-base-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link
              href={`/posts/${post.id}`}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-2 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Post
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Edit Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-base-900 dark:text-base-100 mb-2">Edit Post</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Edit your title and content in the unified editor below.</p>
          </div>
          <form onSubmit={handleUpdatePost}>
            <div className="mb-6">
              <MarkdownEditor
                value={editedPostContent}
                onChange={setEditedPostContent}
                disabled={updating}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {updating ? 'Updating...' : 'Update Post'}
              </button>
              <Link
                href={`/posts/${post.id}`}
                className="px-4 py-2 bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
