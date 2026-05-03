import { readDir, readFile as readFileBinaryFromFs, readTextFile, writeTextFile, DirEntry } from '@tauri-apps/plugin-fs';
import { useCallback, useState } from 'react';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

// Directories to skip for performance
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.idea',
  '.dart_tool',
  'build',
  'dist',
  '.next',
  'target',
  'out',
  'coverage',
  '.vercel',
  '.turbo',
  '.cache',
  '__pycache__',
  'venv',
  '.venv',
  'vendor',
  'Pods',
  '.gradle',
  '.cxx',
  'bin',
  'obj',
  'Debug',
  'Release',
  'x64',
  'x86',
  'ARM64',
  'packages',
  '.pub-cache',
  '.flutter-plugins',
  '.flutter-plugins-dependencies',
  'generated_plugin_registrant',
  'ios/Pods',
  'android/.gradle',
  'android/app/build',
]);

// Maximum depth to traverse by default
const DEFAULT_MAX_DEPTH = 4;

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

async function readDirRecursive(
  rootPath: string,
  maxDepth: number = DEFAULT_MAX_DEPTH
): Promise<FileNode[]> {
  const normRoot = normalizePath(rootPath);
  const results: FileNode[] = [];

  async function walk(currentPath: string, depth: number): Promise<FileNode[]> {
    if (depth > maxDepth) {
      return [{ name: '...', path: currentPath, isDirectory: true, children: [] }];
    }

    let entries: DirEntry[];
    try {
      entries = await readDir(currentPath);
    } catch {
      return [];
    }

    // Sort: directories first, then files, both alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

    const nodes: FileNode[] = [];

    for (const entry of sorted) {
      if (entry.name.startsWith('.') && !entry.name.startsWith('..')) {
        // Skip hidden files/dirs unless it's a known important one
        if (!['.env', '.gitignore', '.dockerignore', '.eslintrc', '.prettierrc'].includes(entry.name)) {
          continue;
        }
      }

      if (entry.isDirectory && SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = normalizePath(`${currentPath}/${entry.name}`);
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory ? [] : undefined,
      };

      if (entry.isDirectory) {
        node.children = await walk(fullPath, depth + 1);
      }

      nodes.push(node);
    }

    return nodes;
  }

  return walk(normRoot, 0);
}

export function useFileSystem() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadWorkspace = useCallback(async (rootPath: string) => {
    setIsLoading(true);
    try {
      const tree = await readDirRecursive(rootPath);
      setFileTree(tree);
    } catch (err) {
      console.error('Failed to load workspace:', err);
      setFileTree([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const readFile = useCallback(async (path: string): Promise<string> => {
    return await readTextFile(path);
  }, []);

  const readFileBinary = useCallback(async (path: string): Promise<Uint8Array> => {
    return await readFileBinaryFromFs(path);
  }, []);

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    return await writeTextFile(path, content);
  }, []);

  return { fileTree, isLoading, loadWorkspace, readFile, readFileBinary, writeFile };
}
