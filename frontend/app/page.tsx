'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import MarkdownEditor from './components/MarkdownEditor';
import { parseMarkdown } from './utils/markdown';
import ThemeToggle from './components/ThemeToggle';
import LoadingSpinner from './components/LoadingSpinner';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('# ');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { title, content } = parseMarkdown(newPostContent);
    
    if (!title.trim()) {
      toast.error('Please enter a title for your post');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) throw new Error('Failed to create post');
      
      const data = await response.json();
      setPosts([data.data, ...posts]);
      setNewPostContent('# ');
      setShowCreateForm(false);
      toast.success('Post created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteModal({ id, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;

    try {
      setDeleting(true);
      const response = await fetch(`${API_URL}/posts/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete post');
      
      setPosts(posts.filter(post => post.id !== deleteModal.id));
      toast.success('Post deleted successfully');
      setDeleteModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <div className="flex gap-3 items-center">
              <ThemeToggle />
              <button
                onClick={fetchPosts}
                className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-base-700 transition-colors font-medium"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 text-sm bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium"
              >
                {showCreateForm ? 'Cancel' : '+ New Post'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Create Post Form */}
      {showCreateForm && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleCreatePost} className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-base-900 dark:text-base-100 mb-2">Create New Post</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Start by typing your title after the # symbol, then press Enter to begin writing.</p>
            </div>
            <div className="mb-6">
              <MarkdownEditor
                value={newPostContent}
                onChange={setNewPostContent}
                disabled={creating}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {creating ? 'Creating...' : 'Create Post'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPostContent('# ');
                }}
                disabled={creating}
                className="px-4 py-2 bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-slate-600 dark:text-slate-400 text-lg mb-4">No posts yet</div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium"
            >
              Create your first post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-base-900 dark:text-base-100 mb-3 line-clamp-2">
                    {post.title}
                  </h2>
                  <div className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 prose prose-sm max-w-none prose-slate dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                    <div>Created: {formatDate(post.created_at)}</div>
                    {post.last_modified !== post.created_at && (
                      <div>Modified: {formatDate(post.last_modified)}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/posts/${post.id}`}
                      className="flex-1 text-center px-3 py-2 text-sm bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 transition-colors font-medium"
                    >
                      View
                    </Link>
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="flex-1 text-center px-3 py-2 text-sm bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 transition-colors font-medium"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(post.id, post.title)}
                      className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Dialog open={!!deleteModal} onClose={handleDeleteCancel} className="relative z-50">
          <div className="fixed inset-0 bg-base-900/50 dark:bg-base-950/50" aria-hidden="true" />
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <DialogPanel className="max-w-lg space-y-4 bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-lg p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-50 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <DialogTitle className="text-lg font-semibold text-base-900 dark:text-base-100 text-center">
                Delete Post
              </DialogTitle>
              
              <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
                Are you sure you want to delete <span className="font-medium text-base-900 dark:text-base-100">"{deleteModal.title}"</span>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </div>
  );
}
