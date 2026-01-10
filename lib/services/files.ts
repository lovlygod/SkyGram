import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import db from '../db';
import { files } from '../db/schema';
import { broadcastEvent } from './event-broadcaster';

// Функция для отправки WebSocket событий
async function sendWebSocketEvent(accountId: string, event: any) {
  try {
    // Используем динамический импорт для избежания проблем с SSR
    const { wsManager } = await import('../websocket/server');
    if (wsManager) {
      wsManager.broadcastToAccount(accountId, event);
    }
  } catch (e) {
    // Если WebSocket недоступен, просто логгируем
    console.debug('WebSocket not available, event not sent:', event);
  }
}

type GetFilesInput = {
  accountId: string;
  folderPath: string;
};
export function getFiles(input: GetFilesInput) {
  const files = db.query.files.findMany({
    where(fields, operators) {
      return operators.and(
        operators.eq(
          fields.accountId,
          input.accountId,
        ),
        operators.eq(
          fields.folderPath,
          input.folderPath,
        ),
        operators.eq(
          fields.isDeleted,
          false, // Исключаем удаленные файлы
        ),
      );
    },
    orderBy(fields, operators) {
      return operators.asc(fields.filename);
    },
  });
  return files;
}

type GetSingleFileInput = {
  id: number;
};
export function getSingleFile(
  input: GetSingleFileInput,
) {
  const file = db.query.files.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, input.id);
    },
  });
  return file;
}

export const CreateFileDTO = z.object({
  filename: z.string(),
  filetype: z.string(),
  size: z.number(),
  folderPath: z.string(),
  accountId: z.string(),
  fileId: z.string(),
  chatId: z.string(),
  messageId: z.string(),
});
type CreateFileInput = z.infer<
  typeof CreateFileDTO
>;
export async function createFile(
  input: CreateFileInput,
) {
  const file = await db
    .insert(files)
    .values(input)
    .returning();

  // Отправляем событие через WebSocket
  await sendWebSocketEvent(input.accountId, {
    type: 'FILE_ADDED',
    accountId: input.accountId,
    payload: file[0],
    timestamp: Date.now(),
  });

  return file;
}

export async function deleteFile(id: number) {
  const file = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, id),
  });

  if (!file) {
    throw new Error(`File with ID ${id} not found`);
  }

  const result = await db
    .update(files)
    .set({ isDeleted: true, deletedAt: new Date().toISOString() })
    .where(eq(files.id, id))
    .returning({ id: files.id });

  // Отправляем событие через WebSocket
  if (file) {
    await sendWebSocketEvent(file.accountId, {
      type: 'FILE_REMOVED',
      accountId: file.accountId,
      payload: { id: file.id },
      timestamp: Date.now(),
    });
 }

  return result;
}

export async function toggleBookmarkFile(
  id: number,
) {
  const file = await db.query.files.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
 });

  if (!file) {
    return null;
  }

  const updatedFile = await db
    .update(files)
    .set({ isBookmarked: !file.isBookmarked })
    .where(eq(files.id, id))
    .returning()
    .then((res) => res[0]);

  // Отправляем событие через WebSocket
  await sendWebSocketEvent(file.accountId, {
    type: 'FILE_UPDATED',
    accountId: file.accountId,
    payload: updatedFile,
    timestamp: Date.now(),
  });

 return updatedFile.isBookmarked;
}

type RenameFileInput = {
  id: number;
  name: string;
};
export async function renameFile(
 input: RenameFileInput,
) {
  const result = await db
    .update(files)
    .set({
      filename: input.name,
    })
    .where(eq(files.id, input.id))
    .returning();
  
  const updatedFile = result[0];
  
  // Отправляем событие через WebSocket
  if (updatedFile) {
    await sendWebSocketEvent(updatedFile.accountId, {
      type: 'FILE_UPDATED',
      accountId: updatedFile.accountId,
      payload: updatedFile,
      timestamp: Date.now(),
    });
  }
  
  return updatedFile;
}

export function getBookmarkedFiles(
  accountId: string,
) {
  return db.query.files.findMany({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.accountId, accountId),
        operators.eq(fields.isBookmarked, true),
      );
    },
  });
}

export function getTrashFiles(accountId: string) {
  return db.query.files.findMany({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.accountId, accountId),
        operators.eq(fields.isDeleted, true),
      );
    },
  });
}

export async function restoreFileFromTrash(fileId: number) {
  const file = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, fileId),
  });

  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }

  const result = await db
    .update(files)
    .set({ isDeleted: false })
    .where(eq(files.id, fileId))
    .returning();

  // Получаем обновленный файл для отправки в событии
  const updatedFile = result[0];

  // Отправляем событие через WebSocket
  sendWebSocketEvent(file.accountId, {
    type: 'FILE_UPDATED',
    accountId: file.accountId,
    payload: updatedFile,
    timestamp: Date.now(),
  });

  return result;
}

export async function deleteFilePermanently(fileId: number) {
  const file = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, fileId),
  });

  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }

  const result = await db.delete(files).where(eq(files.id, fileId));

  // Отправляем событие через WebSocket
  sendWebSocketEvent(file.accountId, {
    type: 'FILE_REMOVED',
    accountId: file.accountId,
    payload: { id: file.id },
    timestamp: Date.now(),
  });

 return result;
}

export async function getFileStats(
  accountId: string,
) {
  const files = await db.query.files.findMany({
    where(fields, operators) {
      return operators.eq(
        fields.accountId,
        accountId,
      );
    },
    columns: {
      size: true,
    },
  });

  const totalSize: number = files
    .map((file) => file.size)
    .reduce((acc, size) => acc + size, 0);
 return {
    totalFiles: files.length,
    totalSize,
 };
}

export async function moveFile(fileId: number, targetPath: string) {
  const file = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, fileId),
  });

  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }

  const result = await db
    .update(files)
    .set({ folderPath: targetPath })
    .where(eq(files.id, fileId))
    .returning();

  const updatedFile = result[0];

  // Отправляем событие через WebSocket
  await sendWebSocketEvent(file.accountId, {
    type: 'FILE_UPDATED',
    accountId: file.accountId,
    payload: updatedFile,
    timestamp: Date.now(),
  });

  return updatedFile;
}

type CopyFileInput = {
 fileId: number;
};
export async function copyFile(input: CopyFileInput) {
  // Получаем оригинальный файл
  const originalFile = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, input.fileId),
  });

  if (!originalFile) {
    throw new Error(`File with ID ${input.fileId} not found`);
  }

  // Генерируем новое имя файла
  const originalName = originalFile.filename;
  let newName = '';
  const lastDotIndex = originalName.lastIndexOf('.');

  if (lastDotIndex > 0) {
    // Файл имеет расширение
    const namePart = originalName.substring(0, lastDotIndex);
    const extension = originalName.substring(lastDotIndex);
    newName = `${namePart}_copy${extension}`;
  } else {
    // Файл не имеет расширения
    newName = `${originalName}_copy`;
  }

  // Проверяем, существует ли уже файл с таким именем, и при необходимости добавляем число
  let counter = 1;
  let finalName = newName;
  let existingFile = await db.query.files.findFirst({
    where: (fields, operators) =>
      operators.and(
        operators.eq(fields.filename, finalName),
        operators.eq(fields.accountId, originalFile.accountId),
        operators.eq(fields.folderPath, originalFile.folderPath || '/')
      ),
  });

  while (existingFile) {
    if (lastDotIndex > 0) {
      const namePart = originalName.substring(0, lastDotIndex);
      const extension = originalName.substring(lastDotIndex);
      finalName = `${namePart}_copy_${counter}${extension}`;
    } else {
      finalName = `${originalName}_copy_${counter}`;
    }
    
    existingFile = await db.query.files.findFirst({
      where: (fields, operators) =>
        operators.and(
          operators.eq(fields.filename, finalName),
          operators.eq(fields.accountId, originalFile.accountId),
          operators.eq(fields.folderPath, originalFile.folderPath || '/')
        ),
    });
    counter++;
  }

  // Создаем копию файла с новым именем
  const newFile = await db
    .insert(files)
    .values({
      filename: finalName,
      filetype: originalFile.filetype,
      size: originalFile.size,
      folderPath: originalFile.folderPath,
      accountId: originalFile.accountId,
      fileId: originalFile.fileId,
      chatId: originalFile.chatId,
      messageId: originalFile.messageId,
      isBookmarked: originalFile.isBookmarked,
    })
    .returning();

  // Отправляем событие через WebSocket
  sendWebSocketEvent(originalFile.accountId, {
    type: 'FILE_ADDED',
    accountId: originalFile.accountId,
    payload: newFile[0],
    timestamp: Date.now(),
  });

  return newFile[0];
}

// Новые методы для пакетных операций
export async function batchDeleteFiles(fileIds: number[]) {
  if (fileIds.length === 0) return [];

  // Получаем информацию о файлах перед удалением, чтобы знать их аккаунты
  const filesInfo = await db.select({ accountId: files.accountId }).from(files).where(inArray(files.id, fileIds));
  if (filesInfo.length === 0) return [];

  const result = await db
    .update(files)
    .set({ isDeleted: true, deletedAt: new Date().toISOString() })
    .where(inArray(files.id, fileIds))
    .returning({ id: files.id });

  // Определяем уникальный accountId для отправки события (предполагаем, что все файлы принадлежат одному аккаунту)
  const accountId = filesInfo[0].accountId;

  // Отправляем событие через broadcastEvent
  await broadcastEvent(accountId, {
    type: 'BATCH_FILE_DELETED',
    accountId: accountId,
    payload: { fileIds: fileIds },
    timestamp: Date.now(),
  });

  return result;
}

export async function batchMoveFiles(fileIds: number[], targetPath: string) {
  if (fileIds.length === 0) return [];

  const result = await db
    .update(files)
    .set({ folderPath: targetPath })
    .where(inArray(files.id, fileIds))
    .returning();

  // Определяем accountId из первого файла
  const firstFile = result[0];
  if (!firstFile) return [];

  // Отправляем событие через broadcastEvent
  await broadcastEvent(firstFile.accountId, {
    type: 'BATCH_FILE_MOVED',
    accountId: firstFile.accountId,
    payload: { files: result },
    timestamp: Date.now(),
  });

  return result;
}

export async function batchBookmarkFiles(fileIds: number[], bookmark: boolean) {
  if (fileIds.length === 0) return [];

  const result = await db
    .update(files)
    .set({ isBookmarked: bookmark })
    .where(inArray(files.id, fileIds))
    .returning();

  // Определяем accountId из первого файла
  const firstFile = result[0];
  if (!firstFile) return [];

  // Отправляем событие через broadcastEvent
  await broadcastEvent(firstFile.accountId, {
    type: 'BATCH_FILE_BOOKMARKED',
    accountId: firstFile.accountId,
    payload: { files: result },
    timestamp: Date.now(),
  });

  return result;
}
