import { mongoSessionRun } from '../../common/mongo/sessionRun';
import { MongoResourcePermission } from './schema';
import { ClientSession, Model } from 'mongoose';
import { NullPermission, PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { PermissionValueType } from '@fastgpt/global/support/permission/type';
import { ParentIdType } from '@fastgpt/global/common/parentFolder/type';
import { getResourceAllClbs } from './controller';

export type SyncChildrenPermissionResourceType = {
  _id: string;
  type: string;
  teamId: string;
  parentId?: ParentIdType;
};
export type UpdateCollaboratorItem = {
  permission: PermissionValueType;
  tmbId: string;
};

// sync the permission to all children folders.
export async function syncChildrenPermission({
  resource,
  folderTypeList,
  resourceType,
  resourceModel,
  session,

  defaultPermission,
  collaborators
}: {
  resource: SyncChildrenPermissionResourceType;

  // when the resource is a folder
  folderTypeList: string[];

  resourceModel: typeof Model;
  resourceType: PerResourceTypeEnum;

  // should be provided when inheritPermission is true
  session: ClientSession;

  defaultPermission?: PermissionValueType;
  collaborators?: UpdateCollaboratorItem[];
}) {
  // only folder has permission
  const isFolder = folderTypeList.includes(resource.type);

  if (!isFolder) return;

  // get all folders and the resource permission of the app
  const allFolders = await resourceModel
    .find(
      {
        teamId: resource.teamId,
        type: { $in: folderTypeList },
        inheritPermission: true
      },
      '_id parentId'
    )
    .lean<SyncChildrenPermissionResourceType[]>()
    .session(session);

  // bfs to get all children
  const queue = [String(resource._id)];
  const children: string[] = [];
  while (queue.length) {
    const parentId = queue.shift();
    const folderChildren = allFolders.filter(
      (folder) => String(folder.parentId) === String(parentId)
    );
    children.push(...folderChildren.map((folder) => folder._id));
    queue.push(...folderChildren.map((folder) => folder._id));
  }
  if (!children.length) return;

  // Sync default permission
  if (defaultPermission !== undefined) {
    await resourceModel.updateMany(
      {
        _id: { $in: children }
      },
      {
        defaultPermission
      },
      { session }
    );
  }

  // sync the resource permission
  if (collaborators) {
    // Update the collaborators of all children
    for await (const childId of children) {
      await syncCollaborators({
        resourceType,
        session,
        collaborators,
        teamId: resource.teamId,
        resourceId: childId
      });
    }
  }
}

/*  Resume the inherit permission of the resource.
  1. Folder: Sync parent's defaultPermission and clbs, and sync its children.
  2. Resource: Sync parent's defaultPermission, and delete all its clbs.
*/
export async function resumeInheritPermission({
  resource,
  folderTypeList,
  resourceType,
  resourceModel,
  session
}: {
  resource: SyncChildrenPermissionResourceType;
  folderTypeList: string[];
  resourceType: PerResourceTypeEnum;
  resourceModel: typeof Model;
  session?: ClientSession;
}) {
  const isFolder = folderTypeList.includes(resource.type);

  const fn = async (session: ClientSession) => {
    const parentResource = await resourceModel
      .findById(resource.parentId, 'defaultPermission')
      .lean<SyncChildrenPermissionResourceType & { defaultPermission: PermissionValueType }>()
      .session(session);

    const parentDefaultPermissionVal = parentResource?.defaultPermission ?? NullPermission;

    // update the resource permission
    await resourceModel.updateOne(
      {
        _id: resource._id
      },
      {
        inheritPermission: true,
        defaultPermission: parentDefaultPermissionVal
      },
      { session }
    );

    // Folder resource, need to sync children
    if (isFolder) {
      const parentClbs = await getResourceAllClbs({
        resourceId: resource.parentId,
        teamId: resource.teamId,
        resourceType,
        session
      });

      // sync self
      await syncCollaborators({
        resourceType,
        collaborators: parentClbs,
        teamId: resource.teamId,
        resourceId: resource._id,
        session
      });
      // sync children
      await syncChildrenPermission({
        resource: {
          ...resource
        },
        resourceModel,
        folderTypeList,
        resourceType,
        session,
        defaultPermission: parentDefaultPermissionVal,
        collaborators: parentClbs
      });
    } else {
      // Not folder, delete all clb
      await MongoResourcePermission.deleteMany({ resourceId: resource._id }, { session });
    }
  };

  if (session) {
    return fn(session);
  } else {
    return mongoSessionRun(fn);
  }
}

/* 
  Delete all the collaborators and then insert the new collaborators.
*/
export async function syncCollaborators({
  resourceType,
  teamId,
  resourceId,
  collaborators,
  session
}: {
  resourceType: PerResourceTypeEnum;
  teamId: string;
  resourceId: string;
  collaborators: UpdateCollaboratorItem[];
  session: ClientSession;
}) {
  await MongoResourcePermission.deleteMany(
    {
      resourceType,
      teamId,
      resourceId
    },
    { session }
  );
  await MongoResourcePermission.insertMany(
    collaborators.map((item) => ({
      teamId: teamId,
      resourceId,
      resourceType: resourceType,
      tmbId: item.tmbId,
      permission: item.permission
    })),
    {
      session
    }
  );
}
