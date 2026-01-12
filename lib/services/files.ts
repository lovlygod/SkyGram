import { eq, inArray, and, sql } from 'drizzle-orm';
import { z } from 'zod';

import db from '../db';
import { files, folders } from '../db/schema';
import { broadcastEvent } from './event-broadcaster';

function isValidPath(path: string): boolean {
  if (path.includes('../') || path.includes('..\\') || path.startsWith('../') || path.startsWith('..\\')) {
    return false;
  }
  
  try {
    const decodedPath = decodeURIComponent(path);
    if (decodedPath.includes('../') || decodedPath.includes('..\\')) {
      return false;
    }
  } catch {
    return false;
  }
  
  return true;
}

async function sendWebSocketEvent(accountId: string, event: any) {
  try {
    const { wsManager } = await import('../websocket/server');
    if (wsManager) {
      wsManager.broadcastToAccount(accountId, event);
    }
  } catch (e) {
    console.debug('WebSocket not available, event not sent:', event);
  }
}

type GetFilesInput = {
  accountId: string;
  folderPath: string;
};
export function getFiles(input: GetFilesInput) {
  const filesResult = db.query.files.findMany({
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
          false,
        ),
      );
    },
    orderBy(fields, operators) {
      return operators.asc(fields.filename);
    },
  });
  
  return filesResult;
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
  if (!isValidPath(input.folderPath)) {
    throw new Error('Invalid folder path');
  }
  
  const file = await db
    .insert(files)
    .values(input)
    .returning();

  await db
    .update(folders)
    .set({
      totalFiles: sql`${folders.totalFiles} + 1`,
      totalSize: sql`${folders.totalSize} + ${input.size}`
    })
    .where(
      and(
        eq(folders.accountId, input.accountId),
        eq(folders.path, input.folderPath)
      )
    );

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

  if (file.folderPath) {
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} - 1`,
        totalSize: sql`${folders.totalSize} - ${file.size}`
      })
      .where(
        and(
          eq(folders.accountId, file.accountId),
          eq(folders.path, file.folderPath)
        )
      );
  }

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

  if (file.folderPath) {
    const bookmarkedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(
        and(
          eq(files.folderPath, file.folderPath),
          eq(files.isBookmarked, true)
        )
      )
      .then(result => result[0]?.count || 0);

    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles}`,
        totalSize: sql`${folders.totalSize}`,
      })
      .where(
        and(
          eq(folders.accountId, file.accountId),
          eq(folders.path, file.folderPath)
        )
      );
  }

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

  const updatedFile = result[0];

  if (file.folderPath) {
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} + 1`,
        totalSize: sql`${folders.totalSize} + ${file.size}`
      })
      .where(
        and(
          eq(folders.accountId, file.accountId),
          eq(folders.path, file.folderPath)
        )
      );
  }

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

  if (!isValidPath(targetPath)) {
    throw new Error('Invalid target path');
  }

  const oldFolderPath = file.folderPath;

  const result = await db
    .update(files)
    .set({ folderPath: targetPath })
    .where(eq(files.id, fileId))
    .returning();

  const updatedFile = result[0];

  if (oldFolderPath !== targetPath) {
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} - 1`,
        totalSize: sql`${folders.totalSize} - ${file.size}`
      })
      .where(
        and(
          eq(folders.accountId, file.accountId),
          eq(folders.path, oldFolderPath || '/')
        )
      );

    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} + 1`,
        totalSize: sql`${folders.totalSize} + ${file.size}`
      })
      .where(
        and(
          eq(folders.accountId, file.accountId),
          eq(folders.path, targetPath)
        )
      );
  }

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
  const originalFile = await db.query.files.findFirst({
    where: (fields, operators) => operators.eq(fields.id, input.fileId),
  });

  if (!originalFile) {
    throw new Error(`File with ID ${input.fileId} not found`);
  }

  const originalName = originalFile.filename;
  let newName = '';
  const lastDotIndex = originalName.lastIndexOf('.');

  if (lastDotIndex > 0) {
    const namePart = originalName.substring(0, lastDotIndex);
    const extension = originalName.substring(lastDotIndex);
    newName = `${namePart}_copy${extension}`;
  } else {
    newName = `${originalName}_copy`;
  }

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

  if (originalFile.folderPath) {
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} + 1`,
        totalSize: sql`${folders.totalSize} + ${originalFile.size}`
      })
      .where(
        and(
          eq(folders.accountId, originalFile.accountId),
          eq(folders.path, originalFile.folderPath)
        )
      );
  }

  sendWebSocketEvent(originalFile.accountId, {
    type: 'FILE_ADDED',
    accountId: originalFile.accountId,
    payload: newFile[0],
    timestamp: Date.now(),
  });

  return newFile[0];
}

export async function batchDeleteFiles(fileIds: number[]) {
  if (fileIds.length === 0) return [];

  const filesToDelete = await db.select({
    accountId: files.accountId,
    folderPath: files.folderPath,
    size: files.size
  }).from(files).where(inArray(files.id, fileIds));

  if (filesToDelete.length === 0) return [];

  const result = await db
    .update(files)
    .set({ isDeleted: true, deletedAt: new Date().toISOString() })
    .where(inArray(files.id, fileIds))
    .returning({ id: files.id });

  const folderStatsMap = new Map<string, { totalFiles: number, totalSize: number }>();
  
  for (const file of filesToDelete) {
    if (file.folderPath) {
      const key = `${file.accountId}-${file.folderPath}`;
      const stats = folderStatsMap.get(key) || { totalFiles: 0, totalSize: 0 };
      stats.totalFiles += 1;
      stats.totalSize += file.size;
      folderStatsMap.set(key, stats);
    }
  }

   const entries = Array.from(folderStatsMap.entries());
   for (const [key, stats] of entries) {
     const [accountId, folderPath] = key.split('-').slice(0, 2);
     await db
       .update(folders)
       .set({
         totalFiles: sql`${folders.totalFiles} - ${stats.totalFiles}`,
         totalSize: sql`${folders.totalSize} - ${stats.totalSize}`
       })
       .where(
         and(
           eq(folders.accountId, accountId),
           eq(folders.path, folderPath)
         )
       );
   }

  const accountId = filesToDelete[0].accountId;

  await broadcastEvent(accountId, {
    type: 'BATCH_FILE_DELETED',
    accountId: accountId,
    payload: { fileIds: fileIds },
  });

  return result;
}

export async function batchMoveFiles(fileIds: number[], targetPath: string) {
  if (fileIds.length === 0) return [];

  if (!isValidPath(targetPath)) {
    throw new Error('Invalid target path');
  }

  const filesToMove = await db.select({
    accountId: files.accountId,
    folderPath: files.folderPath,
    size: files.size
  }).from(files).where(inArray(files.id, fileIds));

  const result = await db
    .update(files)
    .set({ folderPath: targetPath })
    .where(inArray(files.id, fileIds))
    .returning();

  const oldFolderStatsMap = new Map<string, { totalFiles: number, totalSize: number }>();
  const newFolderStatsMap = new Map<string, { totalFiles: number, totalSize: number }>();
  
  for (const file of filesToMove) {
    if (file.folderPath) {
      const oldKey = `${file.accountId}-${file.folderPath}`;
      const oldStats = oldFolderStatsMap.get(oldKey) || { totalFiles: 0, totalSize: 0 };
      oldStats.totalFiles += 1;
      oldStats.totalSize += file.size;
      oldFolderStatsMap.set(oldKey, oldStats);
    }
    
    const newKey = `${file.accountId}-${targetPath}`;
    const newStats = newFolderStatsMap.get(newKey) || { totalFiles: 0, totalSize: 0 };
    newStats.totalFiles += 1;
    newStats.totalSize += file.size;
    newFolderStatsMap.set(newKey, newStats);
  }

  const oldEntries = Array.from(oldFolderStatsMap.entries());
  for (const [key, stats] of oldEntries) {
    const [accountId, folderPath] = key.split('-').slice(0, 2);
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} - ${stats.totalFiles}`,
        totalSize: sql`${folders.totalSize} - ${stats.totalSize}`
      })
      .where(
        and(
          eq(folders.accountId, accountId),
          eq(folders.path, folderPath)
        )
      );
  }

  const newEntries = Array.from(newFolderStatsMap.entries());
  for (const [key, stats] of newEntries) {
    const [accountId, folderPath] = key.split('-').slice(0, 2);
    await db
      .update(folders)
      .set({
        totalFiles: sql`${folders.totalFiles} + ${stats.totalFiles}`,
        totalSize: sql`${folders.totalSize} + ${stats.totalSize}`
      })
      .where(
        and(
          eq(folders.accountId, accountId),
          eq(folders.path, folderPath)
        )
      );
  }

 const firstFile = result[0];
  if (!firstFile) return [];

  await broadcastEvent(firstFile.accountId, {
    type: 'BATCH_FILE_MOVED',
    accountId: firstFile.accountId,
    payload: { files: result },
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

  const firstFile = result[0];
  if (!firstFile) return [];

  await broadcastEvent(firstFile.accountId, {
    type: 'BATCH_FILE_BOOKMARKED',
    accountId: firstFile.accountId,
    payload: { files: result },
  });

  return result;
}
