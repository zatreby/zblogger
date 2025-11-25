"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ThemeToggle from "../../components/ThemeToggle";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ArrowLeft } from "lucide-react";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  last_modified: string;
}

export default function PostPage() {
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
          throw new Error("Post not found");
        }
        throw new Error("Failed to fetch post");
      }
      const data = await response.json();
      setPost(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading post..." />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-base-50 dark:bg-base-900 flex items-center justify-center">
        <div className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm p-8 max-w-md">
          <div className="text-base-900 dark:text-base-100 text-lg font-medium mb-4">
            {error || "Post not found"}
          </div>
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
              href="/"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-2 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
            <div className="flex gap-3 items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Post Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="bg-white dark:bg-base-800 rounded-lg border border-base-200 dark:border-base-700 shadow-sm overflow-hidden">
          <div className="border-b border-base-200 dark:border-base-700 px-6 sm:px-8 py-8">
            <h1 className="text-3xl font-semibold text-base-900 dark:text-base-100 mb-4 tracking-tight">
              {post.title}
            </h1>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <div>Created: {formatDate(post.created_at)}</div>
              {post.last_modified !== post.created_at && (
                <div>Last modified: {formatDate(post.last_modified)}</div>
              )}
            </div>
          </div>

          <div className="px-6 sm:px-8 py-8">
            <div className="prose prose-slate dark:prose-invert prose-lg max-w-none text-base-800 dark:text-base-200 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          <div className="bg-base-50 dark:bg-base-900 border-t border-base-200 dark:border-base-700 px-6 sm:px-8 py-6">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Post ID:{" "}
              <code className="bg-base-200 dark:bg-base-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                {post.id}
              </code>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
