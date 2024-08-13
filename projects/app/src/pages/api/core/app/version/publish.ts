import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import { MongoAppVersion } from '@fastgpt/service/core/app/version/schema';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { beforeUpdateAppFormat } from '@fastgpt/service/core/app/controller';
import { getNextTimeByCronStringAndTimezone } from '@fastgpt/global/common/string/time';
import { PostPublishAppProps } from '@/global/core/app/api';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';

type Response = {};

async function handler(req: NextApiRequest, res: NextApiResponse<any>): Promise<{}> {
  const { appId } = req.query as { appId: string };
  const { nodes = [], edges = [], chatConfig, type } = req.body as PostPublishAppProps;

  const { app } = await authApp({ appId, req, per: WritePermissionVal, authToken: true });

  const { nodes: formatNodes } = beforeUpdateAppFormat({ nodes });

  await mongoSessionRun(async (session) => {
    // create version histories
    const [{ _id }] = await MongoAppVersion.create(
      [
        {
          appId,
          nodes: formatNodes,
          edges,
          chatConfig
        }
      ],
      { session }
    );

    // update app
    await MongoApp.findByIdAndUpdate(
      appId,
      {
        modules: formatNodes,
        edges,
        chatConfig,
        updateTime: new Date(),
        version: 'v2',
        type,
        scheduledTriggerConfig: chatConfig?.scheduledTriggerConfig,
        scheduledTriggerNextTime: chatConfig?.scheduledTriggerConfig?.cronString
          ? getNextTimeByCronStringAndTimezone(chatConfig.scheduledTriggerConfig)
          : null,
        ...(app.type === AppTypeEnum.plugin && { 'pluginData.nodeVersion': _id })
      },
      {
        session
      }
    );
  });

  return {};
}

export default NextAPI(handler);
