import React, { useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface CodeEditorProps {
  filePath: string;
  initialCode?: string;
}

export function CodeEditor({ filePath, initialCode = '' }: CodeEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Determine language blindly from extension
  const extension = filePath.split('.').pop() || '';
  const language = extension === 'rs' ? 'rust' : extension === 'ts' || extension === 'tsx' ? 'typescript' : extension === 'js' ? 'javascript' : extension === 'json' ? 'json' : 'plaintext';

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        path={filePath} // Helps monaco resolve model internally
        defaultValue={initialCode}
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
