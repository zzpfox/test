import React from 'react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { Box, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useI18n } from '@/web/context/I18n';

const VariableTable = ({
  variables = [],
  onEdit,
  onDelete
}: {
  variables: { icon?: string; label: string; type: string; key: string; isTool?: boolean }[];
  onEdit: (key: string) => void;
  onDelete: (key: string) => void;
}) => {
  const { t } = useTranslation();
  const { workflowT } = useI18n();
  const showToolColumn = variables.some((item) => item.isTool);

  return (
    <Box bg={'white'} borderRadius={'md'} overflow={'hidden'} border={'base'}>
      <TableContainer>
        <Table bg={'white'}>
          <Thead>
            <Tr>
              <Th borderBottomLeftRadius={'none !important'}>
                {t('common:core.module.variable.variable name')}
              </Th>
              <Th>{t('common:core.workflow.Value type')}</Th>
              {showToolColumn && <Th>{workflowT('tool_input')}</Th>}
              <Th borderBottomRightRadius={'none !important'}></Th>
            </Tr>
          </Thead>
          <Tbody>
            {variables.map((item) => (
              <Tr key={item.key}>
                <Td>
                  <Flex alignItems={'center'}>
                    {!!item.icon && <MyIcon name={item.icon as any} w={'14px'} mr={1} />}
                    {item.label || item.key}
                  </Flex>
                </Td>
                <Td>{item.type}</Td>
                {showToolColumn && <Th>{item.isTool ? '✅' : '-'}</Th>}
                <Td>
                  <MyIcon
                    mr={3}
                    name={'common/settingLight'}
                    w={'16px'}
                    cursor={'pointer'}
                    onClick={() => onEdit(item.key)}
                  />
                  <MyIcon
                    className="delete"
                    name={'delete'}
                    w={'16px'}
                    color={'myGray.600'}
                    cursor={'pointer'}
                    ml={2}
                    _hover={{ color: 'red.500' }}
                    onClick={() => {
                      onDelete(item.key);
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default React.memo(VariableTable);
