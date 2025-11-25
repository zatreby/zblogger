'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus, Pencil, Trash2, X, Check, LogOut } from 'lucide-react';
import MarkdownEditor from './components/MarkdownEditor';
import { parseMarkdown, combineToMarkdown } from './utils/markdown';
import ThemeToggle from '../components/ThemeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import ProtectedRoute from './components/ProtectedRoute';
import { useAdminAuth } from './contexts/AdminAuthContext';

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  last_modified: string;
}

function AdminHomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPostContent, setNewPostContent] = useState('# ');
  const [creating, setCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { logout } = useAdminAuth();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    fetchPosts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

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
      
      const optimisticPost: Post = {
        id: `temp-${Date.now()}`,
        title,
        content,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };
      setPosts([optimisticPost, ...posts]);
      setNewPostContent('# ');
      setShowCreateForm(false);
      
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, content }),
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) throw new Error('Failed to create post');
      
      const data = await response.json();
      setPosts(posts => [data.data, ...posts.filter(p => p.id !== optimisticPost.id)]);
      toast.success('Post created successfully');
    } catch (err) {
      setPosts(posts => posts.filter(p => !p.id.startsWith('temp-')));
      setShowCreateForm(true);
      setNewPostContent(combineToMarkdown(title, content));
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

    const postToDelete = posts.find(p => p.id === deleteModal.id);
    
    try {
      setDeleting(true);
      
      setPosts(posts.filter(post => post.id !== deleteModal.id));
      setDeleteModal(null);
      
      const response = await fetch(`${API_URL}/posts/${deleteModal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) throw new Error('Failed to delete post');
      
      toast.success('Post deleted successfully');
    } catch (err) {
      if (postToDelete) {
        setPosts([...posts, postToDelete].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      setDeleteModal({ id: deleteModal.id, title: deleteModal.title });
      toast.error(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal(null);
  };

  useKeyboardShortcut({
    key: 'Escape',
    callback: handleDeleteCancel,
    enabled: !!deleteModal,
  });

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
      <header className="bg-white dark:bg-base-800 border-b border-base-200 dark:border-base-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-base-900 dark:text-base-100 tracking-tight">
                Zlogg Admin
              </h1>
              <span className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 text-xs font-medium rounded">
                Admin
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-base-700 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium shadow-sm"
              >
                {showCreateForm ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    New Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

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
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Post
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewPostContent('# ');
                }}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-base-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-base-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {posts.length === 0 ? (
          <EmptyState onAction={() => setShowCreateForm(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer"
              >
                <div className="flex items-start gap-2 p-5 border-b border-base-200 dark:border-base-700">
                  <Link href={`/admin/posts/${post.id}`} className="flex-1 min-w-0">
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
                  <div className="flex gap-1 shrink-0">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="flex items-center justify-center p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-base-700 rounded-md transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(post.id, post.title);
                      }}
                      className="flex items-center justify-center p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Link href={`/admin/posts/${post.id}`} className="flex-1 p-5">
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

export default function ProtectedAdminPage() {
  return (
    <ProtectedRoute>
      <AdminHomePage />
    </ProtectedRoute>
  );
}