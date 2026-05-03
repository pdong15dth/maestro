import React, { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { CodeEditor } from './CodeEditor';
import { isImageFile, isSvgFile, getMimeType } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface FileViewerProps {
  filePath: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function ImagePreview({ filePath, readFileBinary }: { filePath: string; readFileBinary: (path: string) => Promise<Uint8Array> }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setError(null);
    readFileBinary(filePath)
      .then((bytes) => {
        if (cancelled) return;
        const base64 = bytesToBase64(bytes);
        const mime = getMimeType(filePath);
        setSrc(`data:${mime};base64,${base64}`);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => { cancelled = true; };
  }, [filePath, readFileBinary]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
        Failed to load image: {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
        Loading image...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0a0a0b] flex items-center justify-center overflow-auto p-8">
      <img
        src={src}
        alt={filePath}
        className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-zinc-800"
        draggable={false}
      />
    </div>
  );
}

export function FileViewer({ filePath }: FileViewerProps) {
  const { readFileBinary } = useWorkspace();

  if (isImageFile(filePath)) {
    return <ImagePreview filePath={filePath} readFileBinary={readFileBinary} />;
  }

  if (isSvgFile(filePath)) {
    return (
      <PanelGroup direction="horizontal" className="w-full h-full">
        <Panel defaultSize={50} minSize={20}>
          <CodeEditor filePath={filePath} />
        </Panel>
        <PanelResizeHandle className="w-3 group flex items-center justify-center cursor-col-resize outline-none hover:bg-zinc-800/50 transition-colors z-10">
          <div className="w-[1px] h-full bg-zinc-800 group-hover:bg-indigo-500/50 transition-colors" />
        </PanelResizeHandle>
        <Panel defaultSize={50} minSize={20}>
          <ImagePreview filePath={filePath} readFileBinary={readFileBinary} />
        </Panel>
      </PanelGroup>
    );
  }

  return <CodeEditor filePath={filePath} />;
}
