'use client';

import { FileText } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = 'No posts yet',
  description = 'Get started by creating your first post',
  actionLabel = 'Create your first post',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-base-800 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-base-900 dark:text-base-100 mb-2">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-accent-600 dark:bg-accent-500 text-white rounded-md hover:bg-accent-700 dark:hover:bg-accent-600 transition-colors font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

