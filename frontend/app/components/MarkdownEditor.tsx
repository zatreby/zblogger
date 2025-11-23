'use client';

import { useRef, useEffect, useState } from 'react';

interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start typing your post title...',
  disabled = false,
  className = '',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const prefix = '# ';

  // Initialize with # if empty
  useEffect(() => {
    if (!value && textareaRef.current) {
      onChange(prefix);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Ensure it always starts with #
    if (!newValue.startsWith(prefix)) {
      // If user deleted the #, restore it
      if (newValue.length === 0 || !newValue.startsWith('#')) {
        onChange(prefix + newValue.replace(/^#?\s*/, ''));
        return;
      }
    }
    
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;

    // Prevent deleting the # prefix
    if (cursorPos <= prefix.length && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      return;
    }

    // Prevent cursor from going before the prefix
    if (cursorPos < prefix.length && e.key === 'ArrowLeft') {
      e.preventDefault();
      textarea.setSelectionRange(prefix.length, prefix.length);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    const textarea = textareaRef.current;
    if (textarea) {
      // Move cursor to end if it's just the prefix
      if (textarea.value === prefix) {
        setTimeout(() => {
          textarea.setSelectionRange(prefix.length, prefix.length);
        }, 0);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Calculate if we're in title mode (first line only)
  const lines = value.split('\n');
  const isTitleMode = lines.length === 1;

  return (
    <div className={`relative ${className}`}>
      {/* Visual indicator for title mode */}
      {isTitleMode && isFocused && (
        <div className="absolute -top-6 left-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Type your post title, then press Enter to start writing
        </div>
      )}
      
      <div className="relative">
        {/* Prefix overlay for visual emphasis */}
        <div className="absolute left-3 top-3 text-2xl font-bold text-accent-600 dark:text-accent-400 pointer-events-none select-none">
          #
        </div>
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            w-full px-3 py-3 pl-12
            border border-slate-300 dark:border-slate-600 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400
            font-mono text-sm text-base-900 dark:text-base-100
            placeholder-base-400 dark:placeholder-base-500
            resize-y min-h-[400px]
            bg-white dark:bg-base-800
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
            ${isFocused ? 'border-accent-300 dark:border-accent-600 shadow-sm' : ''}
          `}
          placeholder={isTitleMode ? 'Your post title here...' : 'Continue writing your post...'}
          style={{
            lineHeight: '1.75',
          }}
        />
      </div>
      
      {/* Helper text */}
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>
          {isTitleMode 
            ? 'Press Enter after your title to start writing content'
            : 'Markdown supported • Use # for headings, ** for bold, * for italic'}
        </span>
        <span className="font-mono text-slate-400 dark:text-slate-500">
          {lines.length} line{lines.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

