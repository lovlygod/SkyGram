import { z } from 'zod';

import * as services from '#/lib/services/files';
import { broadcastEvent } from '#/lib/services/event-broadcaster';

import { procedure } from '../trpc';

export const getFiles = procedure
  .input(
    z.object({
      accountId: z.string(),
      folderPath: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    return services.getFiles({
      accountId: input.accountId,
      folderPath: input.folderPath ?? '/',
    });
  });

export const createFile = procedure
  .input(services.CreateFileDTO)
  .mutation(async ({ input }) => {
    return services.createFile(input);
  });

export const deleteFile = procedure
  .input(z.number())
  .mutation(async ({ input }) => {
    return services.deleteFile(input);
  });

export const toggleBookmarkFile = procedure
  .input(z.number())
  .mutation(async ({ input }) => {
    const result = await services.toggleBookmarkFile(input);
    // Отправляем событие обновлении файла
    const updatedFile = await services.getSingleFile({ id: input });
    if (updatedFile) {
      await broadcastEvent(updatedFile.accountId, {
        type: 'FILE_UPDATED',
        accountId: updatedFile.accountId,
        payload: updatedFile,
        timestamp: Date.now(),
      });
    }
    return result;
  });

export const renameFile = procedure
  .input(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    return services.renameFile(input);
  });

export const moveFile = procedure
  .input(
    z.object({
      fileId: z.number(),
      targetPath: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    return services.moveFile(input.fileId, input.targetPath);
  });

export const getTrashFiles = procedure
  .input(z.object({
    accountId: z.string(),
  }))
  .query(async ({ input }) => {
    return services.getTrashFiles(input.accountId);
  });

export const restoreFileFromTrash = procedure
  .input(z.object({
    fileId: z.number(),
  }))
  .mutation(async ({ input }) => {
    // Получаем файл перед восстановлением
    const fileBeforeRestore = await services.getSingleFile({ id: input.fileId });
    
    const result = await services.restoreFileFromTrash(input.fileId);
    
    // Если файл существовал до восстановления, отправляем событие
    if (fileBeforeRestore) {
      // Отправляем событие об обновлении файла (теперь isDeleted = false)
      await broadcastEvent(fileBeforeRestore.accountId, {
        type: 'FILE_UPDATED',
        accountId: fileBeforeRestore.accountId,
        payload: { ...fileBeforeRestore, isDeleted: false },
        timestamp: Date.now(),
      });
    }
    
    return result;
  });

export const deleteFilePermanently = procedure
  .input(z.object({
    fileId: z.number(),
  }))
  .mutation(async ({ input }) => {
    return services.deleteFilePermanently(input.fileId);
  });

export const copyFile = procedure
  .input(
    z.object({
      fileId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    return services.copyFile({ fileId: input.fileId });
  });

// Новые маршруты для пакетных операций
export const batchDeleteFiles = procedure
  .input(z.array(z.number()))
  .mutation(async ({ input }) => {
    return services.batchDeleteFiles(input);
  });

export const batchMoveFiles = procedure
  .input(
    z.object({
      fileIds: z.array(z.number()),
      targetPath: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    return services.batchMoveFiles(input.fileIds, input.targetPath);
  });

export const batchBookmarkFiles = procedure
  .input(
    z.object({
      fileIds: z.array(z.number()),
      bookmark: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    return services.batchBookmarkFiles(input.fileIds, input.bookmark);
  });
