'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/github-dark.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-stream text-sm leading-relaxed break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-[#FAFAFA] mt-5 mb-2 pb-1 border-b border-zinc-800 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-[#FAFAFA] mt-4 mb-2 pb-1 border-b border-zinc-800 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-[#FAFAFA] mt-3 mb-1.5 tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5 tracking-tight">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-zinc-200 leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-[#A3E635] hover:text-[#bef264] underline underline-offset-2 decoration-[#A3E635]/40 hover:decoration-[#A3E635] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 text-sm text-zinc-200 mb-3 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 text-sm text-zinc-200 mb-3 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-zinc-200 pl-1 marker:text-zinc-500">
              {children}
            </li>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && (!className || !className.includes('hljs'));
            return isInline ? (
              <code
                className="bg-zinc-800/80 text-[#A3E635] px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-700/60"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className={cn('text-xs font-mono', className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-[#0c0c0d] border border-zinc-800 rounded-md p-3 overflow-x-auto mb-3 relative">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#A3E635]/40 bg-zinc-900/30 pl-4 py-1 my-3 italic text-zinc-300">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm text-left text-zinc-200 border-collapse border border-zinc-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-800/80 text-zinc-100 uppercase text-xs font-bold">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 border border-zinc-700 text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border border-zinc-700 text-zinc-300">
              {children}
            </td>
          ),
          hr: () => <hr className="border-zinc-700 my-4" />,
          strong: ({ children }) => (
            <strong className="text-[#FAFAFA] font-bold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-zinc-300 italic">
              {children}
            </em>
          ),
          del: ({ children }) => (
            <del className="text-zinc-500 line-through">
              {children}
            </del>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="max-w-full rounded-md border border-zinc-800 my-3"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default React.memo(MarkdownRenderer);
