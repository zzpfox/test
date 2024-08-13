import {
  getDatasetPaths,
  putDatasetById,
  getDatasets,
  getDatasetById,
  delDatasetById
} from '@/web/core/dataset/api';
import {
  GetResourceFolderListProps,
  ParentIdType,
  ParentTreePathItemType
} from '@fastgpt/global/common/parentFolder/type';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { createContext } from 'use-context-selector';
import { useI18n } from '@/web/context/I18n';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { DatasetUpdateBody } from '@fastgpt/global/core/dataset/api';
import dynamic from 'next/dynamic';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { DatasetItemType, DatasetListItemType } from '@fastgpt/global/core/dataset/type';
import { EditResourceInfoFormType } from '@/components/common/Modal/EditResourceModal';
import { useTranslation } from 'react-i18next';

const MoveModal = dynamic(() => import('@/components/common/folder/MoveModal'));

export type DatasetContextType = {
  myDatasets: DatasetListItemType[];
  loadMyDatasets: () => Promise<DatasetListItemType[]>;
  refetchPaths: () => void;
  refetchFolderDetail: () => Promise<DatasetItemType | undefined>;
  isFetchingDatasets: boolean;
  setMoveDatasetId: (id: string) => void;
  paths: ParentTreePathItemType[];
  folderDetail?: DatasetItemType;
  editedDataset?: EditResourceInfoFormType;
  setEditedDataset: (data?: EditResourceInfoFormType) => void;
  onDelDataset: (id: string) => Promise<void>;
  onUpdateDataset: (data: DatasetUpdateBody) => Promise<void>;
};

export const DatasetsContext = createContext<DatasetContextType>({
  isFetchingDatasets: false,
  setMoveDatasetId: () => {},
  refetchPaths: () => {},
  paths: [],
  folderDetail: {} as any,
  editedDataset: {} as any,
  setEditedDataset: () => {},
  onDelDataset: () => Promise.resolve(),
  loadMyDatasets: function (): Promise<DatasetListItemType[]> {
    throw new Error('Function not implemented.');
  },
  refetchFolderDetail: function (): Promise<DatasetItemType | undefined> {
    throw new Error('Function not implemented.');
  },
  onUpdateDataset: function (_data: DatasetUpdateBody): Promise<void> {
    throw new Error('Function not implemented.');
  },
  myDatasets: []
});

function DatasetContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { commonT } = useI18n();
  const { t } = useTranslation();
  const [moveDatasetId, setMoveDatasetId] = useState<string>();

  const { parentId = null } = router.query as { parentId?: string | null };

  const {
    data: myDatasets = [],
    runAsync: loadMyDatasets,
    loading: isFetchingDatasets
  } = useRequest2(
    () =>
      getDatasets({
        parentId
      }),
    {
      manual: false,
      refreshDeps: [parentId]
    }
  );

  const { data: folderDetail, runAsync: refetchFolderDetail } = useRequest2(
    () => (parentId ? getDatasetById(parentId) : Promise.resolve(undefined)),
    {
      manual: false,
      refreshDeps: [parentId]
    }
  );

  const { data: paths = [], runAsync: refetchPaths } = useRequest2(
    () => getDatasetPaths(parentId),
    {
      manual: false,
      refreshDeps: [parentId]
    }
  );

  const { runAsync: onUpdateDataset } = useRequest2(putDatasetById, {
    onSuccess: () => Promise.all([refetchFolderDetail(), refetchPaths(), loadMyDatasets()])
  });

  const onMoveDataset = useCallback(
    async (parentId: ParentIdType) => {
      if (!moveDatasetId) return;
      await onUpdateDataset({
        id: moveDatasetId,
        parentId
      });
    },
    [moveDatasetId, onUpdateDataset]
  );

  const getDatasetFolderList = useCallback(async ({ parentId }: GetResourceFolderListProps) => {
    return (
      await getDatasets({
        parentId,
        type: DatasetTypeEnum.folder
      })
    ).map((item) => ({
      id: item._id,
      name: item.name
    }));
  }, []);

  const [editedDataset, setEditedDataset] = useState<EditResourceInfoFormType>();

  const { runAsync: onDelDataset } = useRequest2(delDatasetById, {
    successToast: t('common:common.Delete Success'),
    errorToast: t('common:dataset.Delete Dataset Error')
  });

  const contextValue = {
    isFetchingDatasets,
    setMoveDatasetId,
    paths,
    refetchPaths,
    refetchFolderDetail,
    folderDetail,
    editedDataset,
    setEditedDataset,
    onDelDataset,
    onUpdateDataset,
    myDatasets,
    loadMyDatasets
  };

  return (
    <DatasetsContext.Provider value={contextValue}>
      {children}
      {!!moveDatasetId && (
        <MoveModal
          moveResourceId={moveDatasetId}
          server={getDatasetFolderList}
          title={commonT('Move')}
          onClose={() => setMoveDatasetId(undefined)}
          onConfirm={onMoveDataset}
        />
      )}
    </DatasetsContext.Provider>
  );
}

export default DatasetContextProvider;
