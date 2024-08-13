import React, { useState, useRef, useMemo } from 'react';
import {
  Box,
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  MenuButton,
  Switch
} from '@chakra-ui/react';
import {
  delDatasetCollectionById,
  putDatasetCollectionById,
  postLinkCollectionSync
} from '@/web/core/dataset/api';
import { useQuery } from '@tanstack/react-query';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { useTranslation } from 'next-i18next';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRequest, useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useRouter } from 'next/router';
import MyMenu from '@fastgpt/web/components/common/MyMenu';
import { useEditTitle } from '@/web/common/hooks/useEditTitle';
import {
  DatasetCollectionTypeEnum,
  DatasetStatusEnum,
  DatasetCollectionSyncResultMap
} from '@fastgpt/global/core/dataset/constants';
import { getCollectionIcon } from '@fastgpt/global/core/dataset/utils';
import { TabEnum } from '../../index';
import dynamic from 'next/dynamic';
import SelectCollections from '@/web/core/dataset/components/SelectCollections';
import { useToast } from '@fastgpt/web/hooks/useToast';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { DatasetCollectionSyncResultEnum } from '@fastgpt/global/core/dataset/constants';
import MyBox from '@fastgpt/web/components/common/MyBox';
import { useContextSelector } from 'use-context-selector';
import { CollectionPageContext } from './Context';
import { DatasetPageContext } from '@/web/core/dataset/context/datasetPageContext';
import { useI18n } from '@/web/context/I18n';
import { formatTime2YMDHM } from '@fastgpt/global/common/string/time';
import MyTag from '@fastgpt/web/components/common/Tag/index';
import {
  checkCollectionIsFolder,
  getTrainingTypeLabel
} from '@fastgpt/global/core/dataset/collection/utils';
import { useFolderDrag } from '@/components/common/folder/useFolderDrag';
import TagsPopOver from './TagsPopOver';
import { useSystemStore } from '@/web/common/system/useSystemStore';

const Header = dynamic(() => import('./Header'));
const EmptyCollectionTip = dynamic(() => import('./EmptyCollectionTip'));

const CollectionCard = () => {
  const BoxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { datasetT } = useI18n();
  const { datasetDetail, loadDatasetDetail } = useContextSelector(DatasetPageContext, (v) => v);
  const { feConfigs } = useSystemStore();

  const { openConfirm: openDeleteConfirm, ConfirmModal: ConfirmDeleteModal } = useConfirm({
    content: t('common:dataset.Confirm to delete the file'),
    type: 'delete'
  });
  const { openConfirm: openSyncConfirm, ConfirmModal: ConfirmSyncModal } = useConfirm({
    content: t('common:core.dataset.collection.Start Sync Tip')
  });

  const { onOpenModal: onOpenEditTitleModal, EditModal: EditTitleModal } = useEditTitle({
    title: t('common:Rename')
  });

  const [moveCollectionData, setMoveCollectionData] = useState<{ collectionId: string }>();

  const { collections, Pagination, total, getData, isGetting, pageNum, pageSize } =
    useContextSelector(CollectionPageContext, (v) => v);

  // Ad file status icon
  const formatCollections = useMemo(
    () =>
      collections.map((collection) => {
        const icon = getCollectionIcon(collection.type, collection.name);
        const status = (() => {
          if (collection.trainingAmount > 0) {
            return {
              statusText: t('dataset.collections.Collection Embedding', {
                total: collection.trainingAmount
              }),
              colorSchema: 'gray'
            };
          }
          return {
            statusText: t('common:core.dataset.collection.status.active'),
            colorSchema: 'green'
          };
        })();

        return {
          ...collection,
          icon,
          ...status
        };
      }),
    [collections, t]
  );

  const { runAsync: onUpdateCollection, loading: isUpdating } = useRequest2(
    putDatasetCollectionById,
    {
      onSuccess() {
        getData(pageNum);
      },
      successToast: t('common:common.Update Success')
    }
  );
  const { mutate: onDelCollection, isLoading: isDeleting } = useRequest({
    mutationFn: (collectionId: string) => {
      return delDatasetCollectionById({
        id: collectionId
      });
    },
    onSuccess() {
      getData(pageNum);
    },
    successToast: t('common:common.Delete Success'),
    errorToast: t('common:common.Delete Failed')
  });

  const { mutate: onclickStartSync, isLoading: isSyncing } = useRequest({
    mutationFn: (collectionId: string) => {
      return postLinkCollectionSync(collectionId);
    },
    onSuccess(res: DatasetCollectionSyncResultEnum) {
      getData(pageNum);
      toast({
        status: 'success',
        title: t(DatasetCollectionSyncResultMap[res]?.label as any)
      });
    },
    errorToast: t('common:core.dataset.error.Start Sync Failed')
  });

  const hasTrainingData = useMemo(
    () => !!formatCollections.find((item) => item.trainingAmount > 0),
    [formatCollections]
  );

  useQuery(
    ['refreshCollection'],
    () => {
      getData(pageNum);
      if (datasetDetail.status === DatasetStatusEnum.syncing) {
        loadDatasetDetail(datasetDetail._id);
      }
      return null;
    },
    {
      refetchInterval: 6000,
      enabled: hasTrainingData || datasetDetail.status === DatasetStatusEnum.syncing
    }
  );

  const { getBoxProps, isDropping } = useFolderDrag({
    activeStyles: {
      bg: 'primary.100'
    },
    onDrop: async (dragId: string, targetId: string) => {
      try {
        await putDatasetCollectionById({
          id: dragId,
          parentId: targetId
        });
        getData(pageNum);
      } catch (error) {}
    }
  });

  const isLoading =
    isUpdating || isDeleting || isSyncing || (isGetting && collections.length === 0) || isDropping;

  return (
    <MyBox isLoading={isLoading} h={'100%'} py={[2, 4]}>
      <Flex ref={BoxRef} flexDirection={'column'} py={[1, 3]} h={'100%'}>
        {/* header */}
        <Header />

        {/* collection table */}
        <TableContainer px={[2, 6]} mt={[0, 3]} flex={'1 0 0'} overflowY={'auto'} fontSize={'sm'}>
          <Table variant={'simple'} draggable={false}>
            <Thead draggable={false}>
              <Tr>
                <Th py={4}>{t('common:common.Name')}</Th>
                <Th py={4}>{datasetT('collection.Training type')}</Th>
                <Th py={4}>{t('common:dataset.collections.Data Amount')}</Th>
                <Th py={4}>{datasetT('collection.Create update time')}</Th>
                <Th py={4}>{t('common:common.Status')}</Th>
                <Th py={4}>{datasetT('Enable')}</Th>
                <Th py={4} />
              </Tr>
            </Thead>
            <Tbody>
              <Tr h={'5px'} />
              {formatCollections.map((collection) => (
                <Tr
                  key={collection._id}
                  _hover={{ bg: 'myGray.50' }}
                  cursor={'pointer'}
                  {...getBoxProps({
                    dataId: collection._id,
                    isFolder: collection.type === DatasetCollectionTypeEnum.folder
                  })}
                  draggable={false}
                  onClick={() => {
                    if (collection.type === DatasetCollectionTypeEnum.folder) {
                      router.push({
                        query: {
                          ...router.query,
                          parentId: collection._id
                        }
                      });
                    } else {
                      router.push({
                        query: {
                          ...router.query,
                          collectionId: collection._id,
                          currentTab: TabEnum.dataCard
                        }
                      });
                    }
                  }}
                >
                  <Td minW={'150px'} maxW={['200px', '300px']} draggable py={2}>
                    <Flex alignItems={'center'}>
                      <MyIcon name={collection.icon as any} w={'16px'} mr={2} />
                      <MyTooltip
                        label={t('common:common.folder.Drag Tip')}
                        shouldWrapChildren={false}
                      >
                        <Box color={'myGray.900'} className="textEllipsis">
                          {collection.name}
                        </Box>
                      </MyTooltip>
                    </Flex>
                    {feConfigs?.isPlus && !!collection.tags?.length && (
                      <TagsPopOver currentCollection={collection} />
                    )}
                  </Td>
                  <Td py={2}>
                    {!checkCollectionIsFolder(collection.type) ? (
                      <>{t((getTrainingTypeLabel(collection.trainingType) || '-') as any)}</>
                    ) : (
                      '-'
                    )}
                  </Td>
                  <Td py={2}>{collection.dataAmount || '-'}</Td>
                  <Td fontSize={'xs'} py={2} color={'myGray.500'}>
                    <Box>{formatTime2YMDHM(collection.createTime)}</Box>
                    <Box>{formatTime2YMDHM(collection.updateTime)}</Box>
                  </Td>
                  <Td py={2}>
                    <MyTag showDot colorSchema={collection.colorSchema as any} type={'borderFill'}>
                      {t(collection.statusText as any)}
                    </MyTag>
                  </Td>
                  <Td py={2} onClick={(e) => e.stopPropagation()}>
                    <Switch
                      isChecked={!collection.forbid}
                      size={'sm'}
                      onChange={(e) =>
                        onUpdateCollection({
                          id: collection._id,
                          forbid: !e.target.checked
                        })
                      }
                    />
                  </Td>
                  <Td py={2} onClick={(e) => e.stopPropagation()}>
                    {collection.permission.hasWritePer && (
                      <MyMenu
                        width={100}
                        offset={[-70, 5]}
                        Button={
                          <MenuButton
                            w={'22px'}
                            h={'22px'}
                            borderRadius={'md'}
                            _hover={{
                              color: 'primary.500',
                              '& .icon': {
                                bg: 'myGray.200'
                              }
                            }}
                          >
                            <MyIcon
                              className="icon"
                              name={'more'}
                              h={'16px'}
                              w={'16px'}
                              px={1}
                              py={1}
                              borderRadius={'md'}
                              cursor={'pointer'}
                            />
                          </MenuButton>
                        }
                        menuList={[
                          {
                            children: [
                              ...(collection.type === DatasetCollectionTypeEnum.link
                                ? [
                                    {
                                      label: (
                                        <Flex alignItems={'center'}>
                                          <MyIcon name={'common/refreshLight'} w={'14px'} mr={2} />
                                          {t('common:core.dataset.collection.Sync')}
                                        </Flex>
                                      ),
                                      onClick: () =>
                                        openSyncConfirm(() => {
                                          onclickStartSync(collection._id);
                                        })()
                                    }
                                  ]
                                : []),
                              {
                                label: (
                                  <Flex alignItems={'center'}>
                                    <MyIcon name={'common/file/move'} w={'14px'} mr={2} />
                                    {t('common:Move')}
                                  </Flex>
                                ),
                                onClick: () =>
                                  setMoveCollectionData({ collectionId: collection._id })
                              },
                              {
                                label: (
                                  <Flex alignItems={'center'}>
                                    <MyIcon name={'edit'} w={'14px'} mr={2} />
                                    {t('common:Rename')}
                                  </Flex>
                                ),
                                onClick: () =>
                                  onOpenEditTitleModal({
                                    defaultVal: collection.name,
                                    onSuccess: (newName) =>
                                      onUpdateCollection({
                                        id: collection._id,
                                        name: newName
                                      })
                                  })
                              }
                            ]
                          },
                          {
                            children: [
                              {
                                label: (
                                  <Flex alignItems={'center'}>
                                    <MyIcon
                                      mr={1}
                                      name={'delete'}
                                      w={'14px'}
                                      _hover={{ color: 'red.600' }}
                                    />
                                    <Box>{t('common:common.Delete')}</Box>
                                  </Flex>
                                ),
                                type: 'danger',
                                onClick: () =>
                                  openDeleteConfirm(
                                    () => {
                                      onDelCollection(collection._id);
                                    },
                                    undefined,
                                    collection.type === DatasetCollectionTypeEnum.folder
                                      ? t('common:dataset.collections.Confirm to delete the folder')
                                      : t('common:dataset.Confirm to delete the file')
                                  )()
                              }
                            ]
                          }
                        ]}
                      />
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {total > pageSize && (
            <Flex mt={2} justifyContent={'center'}>
              <Pagination />
            </Flex>
          )}
          {total === 0 && <EmptyCollectionTip />}
        </TableContainer>

        <ConfirmDeleteModal />
        <ConfirmSyncModal />
        <EditTitleModal />

        {!!moveCollectionData && (
          <SelectCollections
            datasetId={datasetDetail._id}
            type="folder"
            defaultSelectedId={[moveCollectionData.collectionId]}
            onClose={() => setMoveCollectionData(undefined)}
            onSuccess={async ({ parentId }) => {
              await putDatasetCollectionById({
                id: moveCollectionData.collectionId,
                parentId
              });
              getData(pageNum);
              setMoveCollectionData(undefined);
              toast({
                status: 'success',
                title: t('common:common.folder.Move Success')
              });
            }}
          />
        )}
      </Flex>
    </MyBox>
  );
};

export default React.memo(CollectionCard);
