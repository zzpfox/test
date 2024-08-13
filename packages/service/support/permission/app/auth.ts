/* Auth app permission */
import { MongoApp } from '../../../core/app/schema';
import { AppDetailType } from '@fastgpt/global/core/app/type.d';
import { parseHeaderCert } from '../controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { AppErrEnum } from '@fastgpt/global/common/error/code/app';
import { getTmbInfoByTmbId } from '../../user/team/controller';
import { getResourcePermission } from '../controller';
import { AppPermission } from '@fastgpt/global/support/permission/app/controller';
import { PermissionValueType } from '@fastgpt/global/support/permission/type';
import { AppFolderTypeList } from '@fastgpt/global/core/app/constants';
import { ParentIdType } from '@fastgpt/global/common/parentFolder/type';
import { splitCombinePluginId } from '../../../core/app/plugin/controller';
import { PluginSourceEnum } from '@fastgpt/global/core/plugin/constants';
import { AuthModeType, AuthResponseType } from '../type';

export const authPluginByTmbId = async ({
  tmbId,
  appId,
  per
}: {
  tmbId: string;
  appId: string;
  per: PermissionValueType;
}) => {
  const { source } = await splitCombinePluginId(appId);
  if (source === PluginSourceEnum.personal) {
    await authAppByTmbId({
      appId,
      tmbId,
      per
    });
  }
};

export const authAppByTmbId = async ({
  tmbId,
  appId,
  per
}: {
  tmbId: string;
  appId: string;
  per: PermissionValueType;
}): Promise<{
  app: AppDetailType;
}> => {
  const { teamId, permission: tmbPer } = await getTmbInfoByTmbId({ tmbId });

  const app = await (async () => {
    const app = await MongoApp.findOne({ _id: appId }).lean();

    if (!app) {
      return Promise.reject(AppErrEnum.unExist);
    }
    const isOwner = tmbPer.isOwner || String(app.tmbId) === String(tmbId);

    const { Per, defaultPermission } = await (async () => {
      if (
        AppFolderTypeList.includes(app.type) ||
        app.inheritPermission === false ||
        !app.parentId
      ) {
        // 1. is a folder. (Folders have compeletely permission)
        // 2. inheritPermission is false.
        // 3. is root folder/app.
        const rp = await getResourcePermission({
          teamId,
          tmbId,
          resourceId: appId,
          resourceType: PerResourceTypeEnum.app
        });
        const Per = new AppPermission({ per: rp?.permission ?? app.defaultPermission, isOwner });
        return {
          Per,
          defaultPermission: app.defaultPermission
        };
      } else {
        // is not folder and inheritPermission is true and is not root folder.
        const { app: parent } = await authAppByTmbId({
          tmbId,
          appId: app.parentId,
          per
        });

        const Per = new AppPermission({
          per: parent.permission.value,
          isOwner
        });
        return {
          Per,
          defaultPermission: parent.defaultPermission
        };
      }
    })();

    if (!Per.checkPer(per)) {
      return Promise.reject(AppErrEnum.unAuthApp);
    }

    return {
      ...app,
      defaultPermission,
      permission: Per
    };
  })();

  return { app };
};

export const authApp = async ({
  appId,
  per,
  ...props
}: AuthModeType & {
  appId: ParentIdType;
  per: PermissionValueType;
}): Promise<
  AuthResponseType & {
    app: AppDetailType;
  }
> => {
  const result = await parseHeaderCert(props);
  const { tmbId } = result;

  if (!appId) {
    return Promise.reject(AppErrEnum.unExist);
  }

  const { app } = await authAppByTmbId({
    tmbId,
    appId,
    per
  });

  return {
    ...result,
    permission: app.permission,
    app
  };
};
