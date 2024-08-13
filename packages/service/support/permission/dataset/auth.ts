import { PermissionValueType } from '@fastgpt/global/support/permission/type';
import { getResourcePermission, parseHeaderCert } from '../controller';
import {
  CollectionWithDatasetType,
  DatasetDataItemType,
  DatasetFileSchema,
  DatasetSchemaType
} from '@fastgpt/global/core/dataset/type';
import { getTmbInfoByTmbId } from '../../user/team/controller';
import { MongoDataset } from '../../../core/dataset/schema';
import { NullPermission, PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { DatasetErrEnum } from '@fastgpt/global/common/error/code/dataset';
import { DatasetPermission } from '@fastgpt/global/support/permission/dataset/controller';
import { getCollectionWithDataset } from '../../../core/dataset/controller';
import { MongoDatasetCollection } from '../../../core/dataset/collection/schema';
import { getFileById } from '../../../common/file/gridfs/controller';
import { BucketNameEnum } from '@fastgpt/global/common/file/constants';
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
import { MongoDatasetData } from '../../../core/dataset/data/schema';
import { AuthModeType, AuthResponseType } from '../type';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { ParentIdType } from '@fastgpt/global/common/parentFolder/type';

export const authDatasetByTmbId = async ({
  tmbId,
  datasetId,
  per
}: {
  tmbId: string;
  datasetId: string;
  per: PermissionValueType;
}): Promise<{
  dataset: DatasetSchemaType & {
    permission: DatasetPermission;
  };
}> => {
  const dataset = await (async () => {
    const [{ teamId, permission: tmbPer }, dataset] = await Promise.all([
      getTmbInfoByTmbId({ tmbId }),
      MongoDataset.findOne({ _id: datasetId }).lean()
    ]);

    if (!dataset) {
      return Promise.reject(DatasetErrEnum.unExist);
    }
    const isOwner = tmbPer.isOwner || String(dataset.tmbId) === String(tmbId);

    // get dataset permission or inherit permission from parent folder.
    const { Per, defaultPermission } = await (async () => {
      if (
        dataset.type === DatasetTypeEnum.folder ||
        dataset.inheritPermission === false ||
        !dataset.parentId
      ) {
        // 1. is a folder. (Folders have compeletely permission)
        // 2. inheritPermission is false.
        // 3. is root folder/dataset.
        const rp = await getResourcePermission({
          teamId,
          tmbId,
          resourceId: datasetId,
          resourceType: PerResourceTypeEnum.dataset
        });
        const Per = new DatasetPermission({
          per: rp?.permission ?? dataset.defaultPermission,
          isOwner
        });
        return {
          Per,
          defaultPermission: dataset.defaultPermission
        };
      } else {
        // is not folder and inheritPermission is true and is not root folder.
        const { dataset: parent } = await authDatasetByTmbId({
          tmbId,
          datasetId: dataset.parentId,
          per
        });

        const Per = new DatasetPermission({
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
      return Promise.reject(DatasetErrEnum.unAuthDataset);
    }

    return {
      ...dataset,
      defaultPermission,
      permission: Per
    };
  })();

  return { dataset };
};

export const authDataset = async ({
  datasetId,
  per,
  ...props
}: AuthModeType & {
  datasetId: ParentIdType;
  per: PermissionValueType;
}): Promise<
  AuthResponseType & {
    dataset: DatasetSchemaType & {
      permission: DatasetPermission;
    };
  }
> => {
  const result = await parseHeaderCert(props);
  const { tmbId } = result;

  if (!datasetId) {
    return Promise.reject(DatasetErrEnum.unExist);
  }

  const { dataset } = await authDatasetByTmbId({
    tmbId,
    datasetId,
    per
  });

  return {
    ...result,
    permission: dataset.permission,
    dataset
  };
};
// the temporary solution for authDatasetCollection is getting the
export async function authDatasetCollection({
  collectionId,
  per = NullPermission,
  ...props
}: AuthModeType & {
  collectionId: string;
}): Promise<
  AuthResponseType<DatasetPermission> & {
    collection: CollectionWithDatasetType;
  }
> {
  const { teamId, tmbId } = await parseHeaderCert(props);
  const collection = await getCollectionWithDataset(collectionId);

  if (!collection) {
    return Promise.reject(DatasetErrEnum.unExist);
  }

  const { dataset } = await authDatasetByTmbId({
    tmbId,
    datasetId: collection.datasetId._id,
    per
  });

  return {
    teamId,
    tmbId,
    collection,
    permission: dataset.permission
  };
}

export async function authDatasetFile({
  fileId,
  per,
  ...props
}: AuthModeType & {
  fileId: string;
}): Promise<
  AuthResponseType<DatasetPermission> & {
    file: DatasetFileSchema;
  }
> {
  const { teamId, tmbId } = await parseHeaderCert(props);

  const [file, collection] = await Promise.all([
    getFileById({ bucketName: BucketNameEnum.dataset, fileId }),
    MongoDatasetCollection.findOne({
      teamId,
      fileId
    })
  ]);

  if (!file) {
    return Promise.reject(CommonErrEnum.fileNotFound);
  }

  if (!collection) {
    return Promise.reject(DatasetErrEnum.unAuthDatasetFile);
  }

  try {
    const { permission } = await authDatasetCollection({
      ...props,
      collectionId: collection._id,
      per
    });

    return {
      teamId,
      tmbId,
      file,
      permission
    };
  } catch (error) {
    return Promise.reject(DatasetErrEnum.unAuthDatasetFile);
  }
}

export async function authDatasetData({
  dataId,
  ...props
}: AuthModeType & {
  dataId: string;
}) {
  // get mongo dataset.data
  const datasetData = await MongoDatasetData.findById(dataId);

  if (!datasetData) {
    return Promise.reject('core.dataset.error.Data not found');
  }

  const result = await authDatasetCollection({
    ...props,
    collectionId: datasetData.collectionId
  });

  const data: DatasetDataItemType = {
    id: String(datasetData._id),
    teamId: datasetData.teamId,
    q: datasetData.q,
    a: datasetData.a,
    chunkIndex: datasetData.chunkIndex,
    indexes: datasetData.indexes,
    datasetId: String(datasetData.datasetId),
    collectionId: String(datasetData.collectionId),
    sourceName: result.collection.name || '',
    sourceId: result.collection?.fileId || result.collection?.rawLink,
    isOwner: String(datasetData.tmbId) === String(result.tmbId),
    canWrite: result.permission.hasWritePer
  };

  return {
    ...result,
    datasetData: data
  };
}
