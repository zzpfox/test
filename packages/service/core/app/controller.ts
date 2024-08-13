import { AppSchema } from '@fastgpt/global/core/app/type';
import { NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { getLLMModel } from '../ai/model';
import { MongoAppVersion } from './version/schema';
import { MongoApp } from './schema';

export const beforeUpdateAppFormat = <T extends AppSchema['modules'] | undefined>({
  nodes
}: {
  nodes: T;
}) => {
  if (nodes) {
    let maxTokens = 3000;

    nodes.forEach((item) => {
      if (
        item.flowNodeType === FlowNodeTypeEnum.chatNode ||
        item.flowNodeType === FlowNodeTypeEnum.tools
      ) {
        const model =
          item.inputs.find((item) => item.key === NodeInputKeyEnum.aiModel)?.value || '';
        const chatModel = getLLMModel(model);
        const quoteMaxToken = chatModel.quoteMaxToken || 3000;

        maxTokens = Math.max(maxTokens, quoteMaxToken);
      }
    });

    nodes.forEach((item) => {
      if (item.flowNodeType === FlowNodeTypeEnum.datasetSearchNode) {
        item.inputs.forEach((input) => {
          if (input.key === NodeInputKeyEnum.datasetMaxTokens) {
            const val = input.value as number;
            if (val > maxTokens) {
              input.value = maxTokens;
            }
          }
        });
      }
    });
  }

  return {
    nodes
  };
};

export const getAppLatestVersion = async (appId: string, app?: AppSchema) => {
  const version = await MongoAppVersion.findOne({
    appId
  }).sort({
    time: -1
  });

  if (version) {
    return {
      nodes: version.nodes,
      edges: version.edges,
      chatConfig: version.chatConfig || app?.chatConfig || {}
    };
  }
  return {
    nodes: app?.modules || [],
    edges: app?.edges || [],
    chatConfig: app?.chatConfig || {}
  };
};

/* Get apps */
export async function findAppAndAllChildren({
  teamId,
  appId,
  fields
}: {
  teamId: string;
  appId: string;
  fields?: string;
}): Promise<AppSchema[]> {
  const find = async (id: string) => {
    const children = await MongoApp.find(
      {
        teamId,
        parentId: id
      },
      fields
    ).lean();

    let apps = children;

    for (const child of children) {
      const grandChildrenIds = await find(child._id);
      apps = apps.concat(grandChildrenIds);
    }

    return apps;
  };
  const [app, childDatasets] = await Promise.all([MongoApp.findById(appId, fields), find(appId)]);

  if (!app) {
    return Promise.reject('Dataset not found');
  }

  return [app, ...childDatasets];
}
