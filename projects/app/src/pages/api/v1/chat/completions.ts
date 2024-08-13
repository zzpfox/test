import type { NextApiRequest, NextApiResponse } from 'next';
import { authApp } from '@fastgpt/service/support/permission/app/auth';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { sseErrRes, jsonRes } from '@fastgpt/service/common/response';
import { addLog } from '@fastgpt/service/common/system/log';
import {
  ChatItemValueTypeEnum,
  ChatRoleEnum,
  ChatSourceEnum
} from '@fastgpt/global/core/chat/constants';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { dispatchWorkFlow } from '@fastgpt/service/core/workflow/dispatch';
import type { ChatCompletionCreateParams } from '@fastgpt/global/core/ai/type.d';
import type { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type.d';
import {
  getDefaultEntryNodeIds,
  getMaxHistoryLimitFromNodes,
  initWorkflowEdgeStatus,
  storeNodes2RuntimeNodes,
  textAdaptGptResponse
} from '@fastgpt/global/core/workflow/runtime/utils';
import { GPTMessages2Chats, chatValue2RuntimePrompt } from '@fastgpt/global/core/chat/adapt';
import { getChatItems } from '@fastgpt/service/core/chat/controller';
import { saveChat } from '@/service/utils/chat/saveChat';
import { responseWrite } from '@fastgpt/service/common/response';
import { pushChatUsage } from '@/service/support/wallet/usage/push';
import { authOutLinkChatStart } from '@/service/support/permission/auth/outLink';
import { pushResult2Remote, addOutLinkUsage } from '@fastgpt/service/support/outLink/tools';
import requestIp from 'request-ip';
import { getUsageSourceByAuthType } from '@fastgpt/global/support/wallet/usage/tools';
import { authTeamSpaceToken } from '@/service/support/permission/auth/team';
import {
  concatHistories,
  filterPublicNodeResponseData,
  getChatTitleFromChatMessage,
  removeEmptyUserInput
} from '@fastgpt/global/core/chat/utils';
import { updateApiKeyUsage } from '@fastgpt/service/support/openapi/tools';
import { getUserChatInfoAndAuthTeamPoints } from '@/service/support/permission/auth/team';
import { AuthUserTypeEnum } from '@fastgpt/global/support/permission/constant';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { UserModelSchema } from '@fastgpt/global/support/user/type';
import { AppSchema } from '@fastgpt/global/core/app/type';
import { AuthOutLinkChatProps } from '@fastgpt/global/support/outLink/api';
import { MongoChat } from '@fastgpt/service/core/chat/chatSchema';
import { ChatErrEnum } from '@fastgpt/global/common/error/code/chat';
import { OutLinkChatAuthProps } from '@fastgpt/global/support/permission/chat';
import { UserChatItemType } from '@fastgpt/global/core/chat/type';
import { DispatchNodeResponseKeyEnum } from '@fastgpt/global/core/workflow/runtime/constants';

import { dispatchWorkFlowV1 } from '@fastgpt/service/core/workflow/dispatchV1';
import { setEntryEntries } from '@fastgpt/service/core/workflow/dispatchV1/utils';
import { NextAPI } from '@/service/middleware/entry';
import { getAppLatestVersion } from '@fastgpt/service/core/app/controller';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import {
  removePluginInputVariables,
  updatePluginInputByVariables
} from '@fastgpt/global/core/workflow/utils';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import {
  getPluginInputsFromStoreNodes,
  getPluginRunContent
} from '@fastgpt/global/core/app/plugin/utils';
import { getSystemTime } from '@fastgpt/global/common/time/timezone';

type FastGptWebChatProps = {
  chatId?: string; // undefined: get histories from messages, '': new chat, 'xxxxx': get histories from db
  appId?: string;
};

export type Props = ChatCompletionCreateParams &
  FastGptWebChatProps &
  OutLinkChatAuthProps & {
    messages: ChatCompletionMessageParam[];
    responseChatItemId?: string;
    stream?: boolean;
    detail?: boolean;
    variables: Record<string, any>; // Global variables or plugin inputs
  };

type AuthResponseType = {
  teamId: string;
  tmbId: string;
  user: UserModelSchema;
  app: AppSchema;
  responseDetail?: boolean;
  authType: `${AuthUserTypeEnum}`;
  apikey?: string;
  canWrite: boolean;
  outLinkUserId?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.on('close', () => {
    res.end();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  let {
    chatId,
    appId,
    // share chat
    shareId,
    outLinkUid,
    // team chat
    teamId: spaceTeamId,
    teamToken,

    stream = false,
    detail = false,
    messages = [],
    variables = {},
    responseChatItemId = getNanoid()
  } = req.body as Props;

  const originIp = requestIp.getClientIp(req);

  const startTime = Date.now();

  try {
    if (!Array.isArray(messages)) {
      throw new Error('messages is not array');
    }

    /* 
      Web params: chatId + [Human]
      API params: chatId + [Human]
      API params: [histories, Human]
    */
    const chatMessages = GPTMessages2Chats(messages);

    // Computed start hook params
    const startHookText = (() => {
      // Chat
      const userQuestion = chatMessages[chatMessages.length - 1] as UserChatItemType | undefined;
      if (userQuestion) return chatValue2RuntimePrompt(userQuestion.value).text;

      // plugin
      return JSON.stringify(variables);
    })();

    /* 
      1. auth app permission
      2. auth balance
      3. get app
      4. parse outLink token
    */
    const { teamId, tmbId, user, app, responseDetail, authType, apikey, canWrite, outLinkUserId } =
      await (async () => {
        // share chat
        if (shareId && outLinkUid) {
          return authShareChat({
            shareId,
            outLinkUid,
            chatId,
            ip: originIp,
            question: startHookText
          });
        }
        // team space chat
        if (spaceTeamId && appId && teamToken) {
          return authTeamSpaceChat({
            teamId: spaceTeamId,
            teamToken,
            appId,
            chatId
          });
        }

        /* parse req: api or token */
        return authHeaderRequest({
          req,
          appId,
          chatId
        });
      })();
    const isPlugin = app.type === AppTypeEnum.plugin;

    // Check message type
    if (isPlugin) {
      detail = true;
    } else {
      if (messages.length === 0) {
        throw new Error('messages is empty');
      }
    }

    // Get obj=Human history
    const userQuestion: UserChatItemType = (() => {
      if (isPlugin) {
        return {
          dataId: getNanoid(24),
          obj: ChatRoleEnum.Human,
          value: [
            {
              type: ChatItemValueTypeEnum.text,
              text: {
                content: getPluginRunContent({
                  pluginInputs: getPluginInputsFromStoreNodes(app.modules),
                  variables
                })
              }
            }
          ]
        };
      }

      const latestHumanChat = chatMessages.pop() as UserChatItemType | undefined;
      if (!latestHumanChat) {
        throw new Error('User question is empty');
      }
      return latestHumanChat;
    })();
    const { text, files } = chatValue2RuntimePrompt(userQuestion.value);

    // Get and concat history;
    const limit = getMaxHistoryLimitFromNodes(app.modules);
    const [{ histories }, { nodes, edges, chatConfig }] = await Promise.all([
      getChatItems({
        appId: app._id,
        chatId,
        limit,
        field: `dataId obj value`
      }),
      getAppLatestVersion(app._id, app)
    ]);
    const newHistories = concatHistories(histories, chatMessages);

    // Get runtimeNodes
    const runtimeNodes = isPlugin
      ? updatePluginInputByVariables(
          storeNodes2RuntimeNodes(nodes, getDefaultEntryNodeIds(nodes)),
          variables
        )
      : storeNodes2RuntimeNodes(nodes, getDefaultEntryNodeIds(nodes));

    const runtimeVariables = removePluginInputVariables(
      variables,
      storeNodes2RuntimeNodes(nodes, getDefaultEntryNodeIds(nodes))
    );

    /* start flow controller */
    const { flowResponses, flowUsages, assistantResponses, newVariables } = await (async () => {
      if (app.version === 'v2') {
        return dispatchWorkFlow({
          res,
          requestOrigin: req.headers.origin,
          mode: 'chat',
          user,
          teamId: String(teamId),
          tmbId: String(tmbId),
          app,
          chatId,
          responseChatItemId,
          runtimeNodes,
          runtimeEdges: initWorkflowEdgeStatus(edges),
          variables: runtimeVariables,
          query: removeEmptyUserInput(userQuestion.value),
          chatConfig,
          histories: newHistories,
          stream,
          detail,
          maxRunTimes: 200
        });
      }
      return dispatchWorkFlowV1({
        res,
        mode: 'chat',
        user,
        teamId: String(teamId),
        tmbId: String(tmbId),
        appId: String(app._id),
        chatId,
        responseChatItemId,
        //@ts-ignore
        modules: setEntryEntries(app.modules),
        variables,
        inputFiles: files,
        histories: newHistories,
        startParams: {
          userChatInput: text
        },
        stream,
        detail,
        maxRunTimes: 200
      });
    })();

    // save chat
    if (chatId) {
      const isOwnerUse = !shareId && !spaceTeamId && String(tmbId) === String(app.tmbId);
      const source = (() => {
        if (shareId) {
          return ChatSourceEnum.share;
        }
        if (authType === 'apikey') {
          return ChatSourceEnum.api;
        }
        if (spaceTeamId) {
          return ChatSourceEnum.team;
        }
        return ChatSourceEnum.online;
      })();

      const newTitle = isPlugin
        ? variables.cTime ?? getSystemTime(user.timezone)
        : getChatTitleFromChatMessage(userQuestion);

      await saveChat({
        chatId,
        appId: app._id,
        teamId,
        tmbId: tmbId,
        nodes,
        appChatConfig: chatConfig,
        variables: newVariables,
        isUpdateUseTime: isOwnerUse && source === ChatSourceEnum.online, // owner update use time
        newTitle,
        shareId,
        outLinkUid: outLinkUserId,
        source,
        content: [
          userQuestion,
          {
            dataId: responseChatItemId,
            obj: ChatRoleEnum.AI,
            value: assistantResponses,
            [DispatchNodeResponseKeyEnum.nodeResponse]: flowResponses
          }
        ],
        metadata: {
          originIp
        }
      });
    }

    addLog.info(`completions running time: ${(Date.now() - startTime) / 1000}s`);

    /* select fe response field */
    const feResponseData = canWrite
      ? flowResponses
      : filterPublicNodeResponseData({ flowResponses });

    if (stream) {
      responseWrite({
        res,
        event: detail ? SseResponseEventEnum.answer : undefined,
        data: textAdaptGptResponse({
          text: null,
          finish_reason: 'stop'
        })
      });
      responseWrite({
        res,
        event: detail ? SseResponseEventEnum.answer : undefined,
        data: '[DONE]'
      });

      if (detail) {
        if (responseDetail || isPlugin) {
          responseWrite({
            res,
            event: SseResponseEventEnum.flowResponses,
            data: JSON.stringify(feResponseData)
          });
        }
      }

      res.end();
    } else {
      const responseContent = (() => {
        if (assistantResponses.length === 0) return '';
        if (assistantResponses.length === 1 && assistantResponses[0].text?.content)
          return assistantResponses[0].text?.content;
        return assistantResponses;
      })();

      res.json({
        ...(detail ? { responseData: feResponseData, newVariables } : {}),
        id: chatId || '',
        model: '',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 1 },
        choices: [
          {
            message: { role: 'assistant', content: responseContent },
            finish_reason: 'stop',
            index: 0
          }
        ]
      });
    }

    // add record
    const { totalPoints } = pushChatUsage({
      appName: app.name,
      appId: app._id,
      teamId,
      tmbId: tmbId,
      source: getUsageSourceByAuthType({ shareId, authType }),
      flowUsages
    });

    if (shareId) {
      pushResult2Remote({ outLinkUid, shareId, appName: app.name, flowResponses });
      addOutLinkUsage({
        shareId,
        totalPoints
      });
    }
    if (apikey) {
      updateApiKeyUsage({
        apikey,
        totalPoints
      });
    }
  } catch (err) {
    if (stream) {
      sseErrRes(res, err);
      res.end();
    } else {
      jsonRes(res, {
        code: 500,
        error: err
      });
    }
  }
}
export default NextAPI(handler);

const authShareChat = async ({
  chatId,
  ...data
}: AuthOutLinkChatProps & {
  shareId: string;
  chatId?: string;
}): Promise<AuthResponseType> => {
  const { teamId, tmbId, user, appId, authType, responseDetail, uid } =
    await authOutLinkChatStart(data);
  const app = await MongoApp.findById(appId).lean();

  if (!app) {
    return Promise.reject('app is empty');
  }

  // get chat
  const chat = await MongoChat.findOne({ appId, chatId }).lean();
  if (chat && (chat.shareId !== data.shareId || chat.outLinkUid !== uid)) {
    return Promise.reject(ChatErrEnum.unAuthChat);
  }

  return {
    teamId,
    tmbId,
    user,
    app,
    responseDetail,
    apikey: '',
    authType,
    canWrite: false,
    outLinkUserId: uid
  };
};
const authTeamSpaceChat = async ({
  appId,
  teamId,
  teamToken,
  chatId
}: {
  appId: string;
  teamId: string;
  teamToken: string;
  chatId?: string;
}): Promise<AuthResponseType> => {
  const { uid } = await authTeamSpaceToken({
    teamId,
    teamToken
  });

  const app = await MongoApp.findById(appId).lean();
  if (!app) {
    return Promise.reject('app is empty');
  }

  const [chat, { user }] = await Promise.all([
    MongoChat.findOne({ appId, chatId }).lean(),
    getUserChatInfoAndAuthTeamPoints(app.tmbId)
  ]);

  if (chat && (String(chat.teamId) !== teamId || chat.outLinkUid !== uid)) {
    return Promise.reject(ChatErrEnum.unAuthChat);
  }

  return {
    teamId,
    tmbId: app.tmbId,
    user,
    app,
    responseDetail: true,
    authType: AuthUserTypeEnum.outLink,
    apikey: '',
    canWrite: false,
    outLinkUserId: uid
  };
};
const authHeaderRequest = async ({
  req,
  appId,
  chatId
}: {
  req: NextApiRequest;
  appId?: string;
  chatId?: string;
}): Promise<AuthResponseType> => {
  const {
    appId: apiKeyAppId,
    teamId,
    tmbId,
    authType,
    apikey,
    canWrite: apiKeyCanWrite
  } = await authCert({
    req,
    authToken: true,
    authApiKey: true
  });

  const { app, canWrite } = await (async () => {
    if (authType === AuthUserTypeEnum.apikey) {
      if (!apiKeyAppId) {
        return Promise.reject(
          'Key is error. You need to use the app key rather than the account key.'
        );
      }
      const app = await MongoApp.findById(apiKeyAppId);

      if (!app) {
        return Promise.reject('app is empty');
      }

      appId = String(app._id);

      return {
        app,
        canWrite: apiKeyCanWrite
      };
    } else {
      // token_auth
      if (!appId) {
        return Promise.reject('appId is empty');
      }
      const { app, permission } = await authApp({
        req,
        authToken: true,
        appId,
        per: ReadPermissionVal
      });

      return {
        app,
        canWrite: permission.hasReadPer
      };
    }
  })();

  const [{ user }, chat] = await Promise.all([
    getUserChatInfoAndAuthTeamPoints(tmbId),
    MongoChat.findOne({ appId, chatId }).lean()
  ]);

  if (chat && (String(chat.teamId) !== teamId || String(chat.tmbId) !== tmbId)) {
    return Promise.reject(ChatErrEnum.unAuthChat);
  }

  return {
    teamId,
    tmbId,
    user,
    app,
    responseDetail: true,
    apikey,
    authType,
    canWrite
  };
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb'
    },
    responseLimit: '20mb'
  }
};
