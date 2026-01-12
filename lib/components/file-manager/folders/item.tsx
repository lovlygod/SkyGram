'use client';

import {
  FolderIcon,
  CheckIcon,
} from 'lucide-react';

import React from 'react';

import type { Folder } from '#/lib/db/schema';

function FolderItem({
  folder,
  onSelect,
  isSelected,
  onDoubleClick,
}: {
  folder: Folder;
  isSelected?: boolean;
  onSelect?(): void;
  onDoubleClick?(): void;
}) {

  return (
    <div
      className={`flex h-28 select-none flex-col items-center justify-center gap-3 rounded-lg
      ${
        isSelected
          ? 'bg-accent'
          : 'bg-transparent hover:bg-accent'
      } transition-all duration-200 ease-in-out hover:scale-105`}
      onClick={(ev) => {
        ev.stopPropagation();
        onSelect?.();
      }}
      onDoubleClick={(ev) => {
        ev.stopPropagation();
        onDoubleClick?.();
      }}
    >
      {isSelected && (
        <div className="absolute top-1 right-1 bg-primary rounded-full p-1 flex items-center justify-center z-10 animate-scale-in shadow-lg">
          <CheckIcon className="text-white dark:text-primary-foreground w-3 h-3" />
        </div>
      )}
      
      <FolderIcon size={30} />

      <h1 className="line-clamp-1">
        {folder.name}
      </h1>
    </div>
  );
}

export default FolderItem;
