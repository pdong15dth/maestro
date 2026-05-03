import React, { useRef, useState, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getLanguageFromPath } from '@/lib/utils';

interface CodeEditorProps {
  filePath: string;
  initialCode?: string;
}

export function CodeEditor({ filePath, initialCode = '' }: CodeEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const { readFile, writeFile } = useWorkspace();
  const [content, setContent] = useState(initialCode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load file content when filePath changes
  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    readFile(filePath)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Failed to read file:', err);
        if (!cancelled) {
          setContent(`// Error loading ${filePath}\n// ${err}`);
          setIsLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [filePath, readFile]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Wire Ctrl+S / Cmd+S to save
    if (monaco) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentValue = editor.getValue();
        writeFile(filePath, currentValue).catch((err) => {
          console.error('Failed to save file:', err);
        });
      });
    }
  };

  // Determine language from file path
  const language = getLanguageFromPath(filePath);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center text-zinc-500 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        path={filePath}
        value={content}
        onChange={(value) => setContent(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          padding: { top: 16 },
        }}
      />
    </div>
  );
}
