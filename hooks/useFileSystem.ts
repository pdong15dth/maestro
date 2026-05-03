import { readDir, readTextFile, writeTextFile, DirEntry } from '@tauri-apps/plugin-fs';
import { useCallback, useState } from 'react';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

async function readDirRecursive(rootPath: string): Promise<FileNode[]> {
  const normRoot = normalizePath(rootPath);
  const results: FileNode[] = [];

  async function walk(currentPath: string): Promise<FileNode[]> {
    const entries: DirEntry[] = await readDir(currentPath);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const fullPath = normalizePath(`${currentPath}/${entry.name}`);
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory,
        children: entry.isDirectory ? [] : undefined,
      };

      if (entry.isDirectory) {
        node.children = await walk(fullPath);
      }

      nodes.push(node);
    }

    return nodes;
  }

  return walk(normRoot);
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

  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    return await writeTextFile(path, content);
  }, []);

  return { fileTree, isLoading, loadWorkspace, readFile, writeFile };
}
