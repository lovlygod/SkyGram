 import { and, eq, or, sql } from 'drizzle-orm';

import db from '../db';
import { folders } from '../db/schema';
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

type GetFolderInput = {
 accountId: string;
 path?: string;
};
export function getFolders(
  input: GetFolderInput,
) {
  return db.query.folders.findMany({
    where(fields, operators) {
      return operators.and(
        operators.eq(
          fields.accountId,
          input.accountId,
        ),
        operators.eq(
          fields.parentPath,
          input.path ?? '/',
        ),
      );
    },
    orderBy(fields, operators) {
      return operators.asc(fields.name);
    },
  });
}

type GetSingleFolderInput = {
  accountId: string;
 path: string;
};
export function getSingleFolder(
  input: GetSingleFolderInput,
) {
  return db.query.folders.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(
          fields.accountId,
          input.accountId,
        ),
        operators.eq(fields.path, input.path),
      );
    },
  });
}

type CreateFolderInput = {
  accountId: string;
  parentPath: string;
  name: string;
};
export async function createFolder(
  input: CreateFolderInput,
) {
 if (!isValidPath(input.parentPath) || !isValidPath(input.name)) {
    throw new Error('Invalid folder path or name');
  }
  
 const existingFolder = await db.query.folders.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.accountId, input.accountId),
        operators.eq(fields.parentPath, input.parentPath),
        operators.eq(fields.name, input.name)
      );
    }
  });
  
 if (existingFolder) {
    throw new Error('Folder with this name already exists in the parent directory');
  }
  
  return db
    .insert(folders)
    .values({
      name: input.name,
      accountId: input.accountId,
      parentPath: input.parentPath,
      path:
        input.parentPath === '/'
          ? `/${input.name}`
          : `${input.parentPath}/${input.name}`,
    })
    .returning()
    .then(async (res) => {
      const newFolder = res[0];
      
      if (input.parentPath !== '/') {
        await db
          .update(folders)
          .set({
            totalFiles: sql`${folders.totalFiles} + 1`,
          })
          .where(
            and(
              eq(folders.accountId, input.accountId),
              eq(folders.path, input.parentPath)
            )
          );
      }
      
      broadcastEvent(input.accountId, {
        type: 'FOLDER_CREATED',
        accountId: input.accountId,
        payload: newFolder,
      });
      
      return { id: newFolder.id };
    });
}

type DeleteFolderInput = {
  accountId: string;
 path: string;
};
export async function deleteFolder(
  input: DeleteFolderInput,
) {
  if (!isValidPath(input.path)) {
    throw new Error('Invalid folder path');
  }
  
  const folderToDelete = await db.query.folders.findFirst({
    where: (fields, operators) =>
      and(
        eq(folders.accountId, input.accountId),
        eq(folders.path, input.path),
      ),
  });
  
  if (!folderToDelete) {
    throw new Error('Folder not found');
  }
  
  return db
    .delete(folders)
    .where(
      and(
        eq(folders.accountId, input.accountId),
        eq(folders.path, input.path),
      ),
    )
    .returning()
    .then(async (res) => {
      if (res.length > 0) {
        if (folderToDelete.parentPath && folderToDelete.parentPath !== '/') {
          await db
            .update(folders)
            .set({
              totalFiles: sql`${folders.totalFiles} - ${folderToDelete.totalFiles ?? 0}`,
              totalSize: sql`${folders.totalSize} - ${folderToDelete.totalSize ?? 0}`
            })
            .where(
              and(
                eq(folders.accountId, input.accountId),
                eq(folders.path, folderToDelete.parentPath)
              )
            );
        }
        
        broadcastEvent(input.accountId, {
          type: 'FOLDER_DELETED',
          accountId: input.accountId,
          payload: { path: input.path },
        });
      }
      
      return { id: res[0]?.id };
    });
}

type RenameFolderInput = {
  id: number;
  name: string;
};
export async function renameFolder(
 input: RenameFolderInput,
) {
  const folder = await db.query.folders.findFirst(
    {
      where(fields, operators) {
        return operators.eq(fields.id, input.id);
      },
    },
  );
 if (!folder) {
    return null;
 }

  const existingFolder = await db.query.folders.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.accountId, folder.accountId),
        operators.eq(fields.parentPath, folder.parentPath || '/'),
        operators.eq(fields.name, input.name)
      );
    }
  });
  
  if (existingFolder) {
    throw new Error('Folder with this name already exists in the parent directory');
  }

  const oldPath = folder.path;
  const newPath =
    folder.parentPath === '/'
      ? `/${input.name}`
      : `${folder.parentPath}/${input.name}`;

 return db
    .update(folders)
    .set({
      name: input.name,
      path: newPath,
    })
    .where(eq(folders.id, input.id))
    .returning()
    .then(async (res) => {
      const updatedFolder = res[0];
      
      await db
        .update(folders)
        .set({
          path: sql`REPLACE(${folders.path}, '${oldPath}/', '${newPath}/')`,
        })
        .where(
          and(
            eq(folders.accountId, folder.accountId),
            sql`${folders.path} LIKE '${oldPath}/%'`
          )
        );
      
      const filesSchema = await import('../db/schema');
      await db
        .update(filesSchema.files)
        .set({
          folderPath: sql`REPLACE(${filesSchema.files.folderPath}, '${oldPath}', '${newPath}')`,
        })
        .where(
          and(
            eq(filesSchema.files.accountId, folder.accountId),
            sql`${filesSchema.files.folderPath} LIKE '${oldPath}%'`
          )
        );
      
      broadcastEvent(folder.accountId, {
        type: 'FOLDER_RENAMED',
        accountId: folder.accountId,
        payload: updatedFolder,
      });
      
      return { name: updatedFolder.name };
    });
}
