import React from 'react';
import { getNomoFileIcon, getNomoFolderIcon } from '@/lib/nomo-icons';

interface NomoFileIconProps {
  fileName: string;
  isFolder?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
}

export function NomoFileIcon({
  fileName,
  isFolder = false,
  isOpen = false,
  size = 16,
  className = '',
}: NomoFileIconProps) {
  const src = isFolder
    ? getNomoFolderIcon(fileName, isOpen)
    : getNomoFileIcon(fileName);

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 inline-block ${className}`}
      style={{ imageRendering: 'auto' }}
      draggable={false}
    />
  );
}
