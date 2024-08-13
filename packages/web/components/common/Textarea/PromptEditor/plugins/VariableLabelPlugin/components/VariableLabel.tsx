import { ChevronRightIcon } from '@chakra-ui/icons';
import { Box } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import Avatar from '../../../../../../../components/common/Avatar';

export default function VariableLabel({
  variableLabel,
  nodeAvatar
}: {
  variableLabel: string;
  nodeAvatar: string;
}) {
  const { t } = useTranslation();
  const [parentLabel, childLabel] = variableLabel.split('.');

  return (
    <>
      <Box
        display="inline-flex"
        alignItems="center"
        m={'2px'}
        rounded={'4px'}
        px={1.5}
        py={'1px'}
        bg={parentLabel !== 'undefined' ? 'primary.50' : 'red.50'}
        color={parentLabel !== 'undefined' ? 'myGray.900' : 'red.600'}
      >
        {parentLabel !== 'undefined' ? (
          <span>
            <Avatar
              src={nodeAvatar as any}
              w={'1rem'}
              mr={1}
              borderRadius={'xs'}
              display={'inline-flex'}
              verticalAlign={'middle'}
              mb={'3px'}
            />
            {parentLabel}
            <ChevronRightIcon />
            {childLabel}
          </span>
        ) : (
          <>
            <Box>{t('common:invalid_variable')}</Box>
          </>
        )}
      </Box>
    </>
  );
}
