import React, { useState } from 'react';
import {
  Flex,
  Box,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  useDisclosure,
  ModalBody,
  HStack
} from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import { getAppChatLogs } from '@/web/core/app/api';
import dayjs from 'dayjs';
import { ChatSourceMap } from '@fastgpt/global/core/chat/constants';
import { AppLogsListItemType } from '@/types/app';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { addDays } from 'date-fns';
import { usePagination } from '@fastgpt/web/hooks/usePagination';
import DateRangePicker, { DateRangeType } from '@fastgpt/web/components/common/DateRangePicker';
import { useI18n } from '@/web/context/I18n';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import { useContextSelector } from 'use-context-selector';
import { AppContext } from '../context';
import { cardStyles } from '../constants';

import dynamic from 'next/dynamic';
import { useSystem } from '@fastgpt/web/hooks/useSystem';
const DetailLogsModal = dynamic(() => import('./DetailLogsModal'));

const Logs = () => {
  const { t } = useTranslation();
  const { appT } = useI18n();
  const { isPc } = useSystem();

  const appId = useContextSelector(AppContext, (v) => v.appId);

  const [dateRange, setDateRange] = useState<DateRangeType>({
    from: addDays(new Date(), -7),
    to: new Date()
  });

  const {
    isOpen: isOpenMarkDesc,
    onOpen: onOpenMarkDesc,
    onClose: onCloseMarkDesc
  } = useDisclosure();

  const {
    data: logs,
    isLoading,
    Pagination,
    getData,
    pageNum
  } = usePagination<AppLogsListItemType>({
    api: getAppChatLogs,
    pageSize: 20,
    params: {
      appId,
      dateStart: dateRange.from || new Date(),
      dateEnd: addDays(dateRange.to || new Date(), 1)
    }
  });

  const [detailLogsId, setDetailLogsId] = useState<string>();

  return (
    <>
      <Box {...cardStyles} boxShadow={2} px={[4, 8]} py={[4, 6]}>
        {isPc && (
          <>
            <Box fontWeight={'bold'} fontSize={['md', 'lg']} mb={2}>
              {appT('chat_logs')}
            </Box>
            <Box color={'myGray.500'} fontSize={'sm'}>
              {appT('chat_logs_tips')},{' '}
              <Box
                as={'span'}
                mr={2}
                textDecoration={'underline'}
                cursor={'pointer'}
                onClick={onOpenMarkDesc}
              >
                {t('common:core.chat.Read Mark Description')}
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* table */}
      <Flex
        flexDirection={'column'}
        {...cardStyles}
        boxShadow={3.5}
        mt={4}
        px={[4, 8]}
        py={[4, 6]}
        flex={'1 0 0'}
      >
        <TableContainer mt={[0, 3]} flex={'1 0 0'} h={0} overflowY={'auto'}>
          <Table variant={'simple'} fontSize={'sm'}>
            <Thead>
              <Tr>
                <Th>{t('common:core.app.logs.Source And Time')}</Th>
                <Th>{appT('logs_title')}</Th>
                <Th>{appT('logs_message_total')}</Th>
                <Th>{appT('feedback_count')}</Th>
                <Th>{t('common:core.app.feedback.Custom feedback')}</Th>
                <Th>{appT('mark_count')}</Th>
              </Tr>
            </Thead>
            <Tbody fontSize={'xs'}>
              {logs.map((item) => (
                <Tr
                  key={item._id}
                  _hover={{ bg: 'myWhite.600' }}
                  cursor={'pointer'}
                  title={t('common:core.view_chat_detail')}
                  onClick={() => setDetailLogsId(item.id)}
                >
                  <Td>
                    <Box>{t(ChatSourceMap[item.source]?.name || ('UnKnow' as any))}</Box>
                    <Box color={'myGray.500'}>{dayjs(item.time).format('YYYY/MM/DD HH:mm')}</Box>
                  </Td>
                  <Td className="textEllipsis" maxW={'250px'}>
                    {item.title}
                  </Td>
                  <Td>{item.messageCount}</Td>
                  <Td w={'100px'}>
                    {!!item?.userGoodFeedbackCount && (
                      <Flex
                        mb={item?.userGoodFeedbackCount ? 1 : 0}
                        bg={'green.100'}
                        color={'green.600'}
                        px={3}
                        py={1}
                        alignItems={'center'}
                        justifyContent={'center'}
                        borderRadius={'md'}
                        fontWeight={'bold'}
                      >
                        <MyIcon
                          mr={1}
                          name={'core/chat/feedback/goodLight'}
                          color={'green.600'}
                          w={'14px'}
                        />
                        {item.userGoodFeedbackCount}
                      </Flex>
                    )}
                    {!!item?.userBadFeedbackCount && (
                      <Flex
                        bg={'#FFF2EC'}
                        color={'#C96330'}
                        px={3}
                        py={1}
                        alignItems={'center'}
                        justifyContent={'center'}
                        borderRadius={'md'}
                        fontWeight={'bold'}
                      >
                        <MyIcon
                          mr={1}
                          name={'core/chat/feedback/badLight'}
                          color={'#C96330'}
                          w={'14px'}
                        />
                        {item.userBadFeedbackCount}
                      </Flex>
                    )}
                    {!item?.userGoodFeedbackCount && !item?.userBadFeedbackCount && <>-</>}
                  </Td>
                  <Td>{item.customFeedbacksCount || '-'}</Td>
                  <Td>{item.markCount}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {logs.length === 0 && !isLoading && <EmptyTip text={appT('logs_empty')}></EmptyTip>}
        </TableContainer>

        <HStack w={'100%'} mt={3} justifyContent={'flex-end'}>
          <DateRangePicker
            defaultDate={dateRange}
            position="top"
            onChange={setDateRange}
            onSuccess={() => getData(1)}
          />
          <Pagination />
        </HStack>
      </Flex>

      {!!detailLogsId && (
        <DetailLogsModal
          appId={appId}
          chatId={detailLogsId}
          onClose={() => {
            setDetailLogsId(undefined);
            getData(pageNum);
          }}
        />
      )}
      <MyModal
        isOpen={isOpenMarkDesc}
        onClose={onCloseMarkDesc}
        title={t('common:core.chat.Mark Description Title')}
      >
        <ModalBody whiteSpace={'pre-wrap'}>{t('common:core.chat.Mark Description')}</ModalBody>
      </MyModal>
    </>
  );
};

export default React.memo(Logs);
