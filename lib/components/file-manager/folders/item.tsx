'use client';

import {
  CopyIcon,
  DownloadIcon,
  Edit2Icon,
  ExternalLinkIcon,
  FolderIcon,
  InfoIcon,
  TrashIcon,
  CheckIcon,
} from 'lucide-react';

import React, { useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '#/lib/components/ui/context-menu';
import type { Folder } from '#/lib/db/schema';
import { useTranslation } from '#/lib/hooks/useTranslation';

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
  const [isRightClicked, setIsRightClicked] =
    useState(false);
  const { t } = useTranslation();

  return (
    <ContextMenu
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setIsRightClicked(true);
        } else {
          setIsRightClicked(false);
        }
      }}
    >
      <ContextMenuTrigger>
        <div
          className={`flex h-28 select-none flex-col items-center justify-center gap-3 rounded-lg
          ${
            isSelected
              ? 'bg-accent'
              : isRightClicked
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
          {/* Индикатор выбора */}
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
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem className="gap-2">
          <ExternalLinkIcon size={16} />
          {t('Open with')}
        </ContextMenuItem>
        <ContextMenuItem className="gap-2">
          <DownloadIcon size={16} />
          {t('Download')}
        </ContextMenuItem>
        <ContextMenuItem className="gap-2">
          <TrashIcon size={16} />
          {t('Move to Trash')}
        </ContextMenuItem>
        <ContextMenuItem className="gap-2">
          <InfoIcon size={16} />
          {t('File Information')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>
            {t('Organize')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem>
              {t('Move to')}
            </ContextMenuItem>
            <ContextMenuItem>
              {t('Add to Bookmark')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>
              {t('Hide')}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem className="gap-2">
          <Edit2Icon size={16} />
          {t('Rename')}
        </ContextMenuItem>
        <ContextMenuItem className="gap-2">
          <CopyIcon size={16} />
          {t('Make a copy')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default FolderItem;
