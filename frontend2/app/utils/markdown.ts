/**
 * Parses markdown content to extract title and body
 * Title is expected to be on the first line starting with # 
 */
export function parseMarkdown(markdown: string): { title: string; content: string } {
  if (!markdown?.trim()) {
    return { title: '', content: '' };
  }

  const lines = markdown.split('\n');
  const firstLine = lines[0] ?? '';
  
  // Extract title from first line (remove # and trim)
  const title = firstLine.replace(/^#\s*/, '').trim();
  
  // Content is everything after the first line
  const content = lines.slice(1).join('\n').trim();
  
  return { title, content };
}

/**
 * Combines title and content into markdown format
 */
export function combineToMarkdown(title: string, content: string): string {
  const titleLine = `# ${title.trim()}`;
  const contentText = content.trim();
  
  if (!contentText) {
    return titleLine;
  }
  
  return `${titleLine}\n${contentText}`;
}

