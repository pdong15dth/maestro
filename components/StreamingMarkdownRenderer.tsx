'use client';

import React, { useState, useEffect, useRef } from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface StreamingMarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingMarkdownRenderer({
  content,
  isStreaming,
  className,
}: StreamingMarkdownRendererProps) {
  const [rendered, setRendered] = useState(content);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(content);

  useEffect(() => {
    pendingRef.current = content;

    if (!isStreaming) {
      // When not streaming, update immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setRendered(content);
      return;
    }

    // When streaming, debounce markdown re-renders to avoid jank.
    // We throttle to at most one markdown parse every 200ms.
    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        setRendered(pendingRef.current);
        timeoutRef.current = null;
      }, 200);
    }

    return () => {
      // cleanup on unmount only; we want the timer to keep running across content updates
    };
  }, [content, isStreaming]);

  // Cancel any pending timer when unmounting
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <MarkdownRenderer content={rendered} className={className} />;
}
