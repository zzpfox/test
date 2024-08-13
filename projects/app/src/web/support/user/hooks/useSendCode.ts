import { useState, useMemo } from 'react';
import { sendAuthCode } from '@/web/support/user/api';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { useTranslation } from 'next-i18next';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
let timer: NodeJS.Timeout;

export const useSendCode = () => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const [codeCountDown, setCodeCountDown] = useState(0);

  const { runAsync: sendCode, loading: codeSending } = useRequest2(
    async ({ username, type }: { username: string; type: `${UserAuthTypeEnum}` }) => {
      if (codeCountDown > 0) return;
      const googleToken = await getClientToken(feConfigs.googleClientVerKey);
      await sendAuthCode({ username, type, googleToken });
      setCodeCountDown(60);

      timer = setInterval(() => {
        setCodeCountDown((val) => {
          if (val <= 0) {
            clearInterval(timer);
          }
          return val - 1;
        });
      }, 1000);
    },
    {
      successToast: t('user:password.code_sended'),
      errorToast: t('user:password.code_send_error'),
      refreshDeps: [codeCountDown, feConfigs?.googleClientVerKey]
    }
  );

  const sendCodeText = useMemo(() => {
    if (codeSending) return t('common:support.user.auth.Sending Code');
    if (codeCountDown >= 10) {
      return `${codeCountDown}${t('user:password.get_code_again')}`;
    }
    if (codeCountDown > 0) {
      return `0${codeCountDown}${t('user:password.get_code_again')}`;
    }
    return t('user:password.get_code');
  }, [codeCountDown, codeSending, t]);

  return {
    codeSending,
    sendCode,
    sendCodeText,
    codeCountDown
  };
};

export function getClientToken(googleClientVerKey?: string) {
  if (!googleClientVerKey || typeof window.grecaptcha === 'undefined' || !window.grecaptcha?.ready)
    return '';
  return new Promise<string>((resolve, reject) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(googleClientVerKey, {
          action: 'submit'
        });
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}
