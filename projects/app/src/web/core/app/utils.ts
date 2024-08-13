import {
  AppChatConfigType,
  AppDetailType,
  AppSchema,
  AppSimpleEditFormType
} from '@fastgpt/global/core/app/type';
import { StoreNodeItemType } from '@fastgpt/global/core/workflow/type/node.d';
import {
  FlowNodeInputTypeEnum,
  FlowNodeTypeEnum
} from '@fastgpt/global/core/workflow/node/constant';
import { NodeInputKeyEnum, WorkflowIOValueTypeEnum } from '@fastgpt/global/core/workflow/constants';

import { getNanoid } from '@fastgpt/global/common/string/tools';
import { StoreEdgeItemType } from '@fastgpt/global/core/workflow/type/edge';
import { EditorVariablePickerType } from '@fastgpt/web/components/common/Textarea/PromptEditor/type';
import { TFunction } from 'next-i18next';
import { ToolModule } from '@fastgpt/global/core/workflow/template/system/tools';
import { useDatasetStore } from '../dataset/store/dataset';
import {
  WorkflowStart,
  userFilesInput
} from '@fastgpt/global/core/workflow/template/system/workflowStart';
import { SystemConfigNode } from '@fastgpt/global/core/workflow/template/system/systemConfig';
import { AiChatModule } from '@fastgpt/global/core/workflow/template/system/aiChat';
import { DatasetSearchModule } from '@fastgpt/global/core/workflow/template/system/datasetSearch';
import { ReadFilesNodes } from '@fastgpt/global/core/workflow/template/system/readFiles';

type WorkflowType = {
  nodes: StoreNodeItemType[];
  edges: StoreEdgeItemType[];
};
export function form2AppWorkflow(
  data: AppSimpleEditFormType,
  t: any // i18nT
): WorkflowType & {
  chatConfig: AppChatConfigType;
} {
  const workflowStartNodeId = 'workflowStartNodeId';
  const datasetNodeId = 'iKBoX2vIzETU';
  const aiChatNodeId = '7BdojPlukIQw';

  const allDatasets = useDatasetStore.getState().allDatasets;
  const selectedDatasets = data.dataset.datasets.filter((item) =>
    allDatasets.some((ds) => ds._id === item.datasetId)
  );

  function systemConfigTemplate(): StoreNodeItemType {
    return {
      nodeId: SystemConfigNode.id,
      name: t(SystemConfigNode.name),
      intro: '',
      flowNodeType: SystemConfigNode.flowNodeType,
      position: {
        x: 531.2422736065552,
        y: -486.7611729549753
      },
      version: SystemConfigNode.version,
      inputs: [],
      outputs: []
    };
  }
  function workflowStartTemplate(): StoreNodeItemType {
    return {
      nodeId: workflowStartNodeId,
      name: t(WorkflowStart.name),
      intro: '',
      avatar: WorkflowStart.avatar,
      flowNodeType: WorkflowStart.flowNodeType,
      position: {
        x: 558.4082376415505,
        y: 123.72387429194112
      },
      version: WorkflowStart.version,
      inputs: WorkflowStart.inputs,
      outputs: [...WorkflowStart.outputs, userFilesInput]
    };
  }
  function aiChatTemplate(formData: AppSimpleEditFormType): StoreNodeItemType {
    return {
      nodeId: aiChatNodeId,
      name: t(AiChatModule.name),
      intro: t(AiChatModule.intro),
      avatar: AiChatModule.avatar,
      flowNodeType: AiChatModule.flowNodeType,
      showStatus: true,
      position: {
        x: 1106.3238387960757,
        y: -350.6030674683474
      },
      version: AiChatModule.version,
      inputs: [
        {
          key: 'model',
          renderTypeList: [FlowNodeInputTypeEnum.settingLLMModel, FlowNodeInputTypeEnum.reference],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.aiSettings.model
        },
        {
          key: 'temperature',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.aiSettings.temperature,
          valueType: WorkflowIOValueTypeEnum.number,
          min: 0,
          max: 10,
          step: 1
        },
        {
          key: 'maxToken',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.aiSettings.maxToken,
          valueType: WorkflowIOValueTypeEnum.number,
          min: 100,
          max: 4000,
          step: 50
        },
        {
          key: 'isResponseAnswerText',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: true,
          valueType: WorkflowIOValueTypeEnum.boolean
        },
        {
          key: 'quoteTemplate',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'quotePrompt',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'systemPrompt',
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          max: 3000,
          valueType: WorkflowIOValueTypeEnum.string,
          label: 'core.ai.Prompt',
          description: 'core.app.tip.chatNodeSystemPromptTip',
          placeholder: 'core.app.tip.chatNodeSystemPromptTip',
          value: formData.aiSettings.systemPrompt
        },
        {
          key: 'history',
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.chatHistory,
          label: 'core.module.input.label.chat history',
          required: true,
          min: 0,
          max: 30,
          value: formData.aiSettings.maxHistories
        },
        {
          key: 'userChatInput',
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          valueType: WorkflowIOValueTypeEnum.string,
          label: '用户问题',
          required: true,
          toolDescription: '用户问题',
          value: [workflowStartNodeId, 'userChatInput']
        },
        {
          key: 'quoteQA',
          renderTypeList: [FlowNodeInputTypeEnum.settingDatasetQuotePrompt],
          label: '',
          debugLabel: '知识库引用',
          description: '',
          valueType: WorkflowIOValueTypeEnum.datasetQuote,
          value: selectedDatasets ? [datasetNodeId, 'quoteQA'] : undefined
        },
        {
          key: NodeInputKeyEnum.aiChatVision,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: true
        }
      ],
      outputs: AiChatModule.outputs
    };
  }
  function datasetNodeTemplate(formData: AppSimpleEditFormType, question: any): StoreNodeItemType {
    return {
      nodeId: datasetNodeId,
      name: t(DatasetSearchModule.name),
      intro: t(DatasetSearchModule.intro),
      avatar: DatasetSearchModule.avatar,
      flowNodeType: DatasetSearchModule.flowNodeType,
      showStatus: true,
      position: {
        x: 918.5901682164496,
        y: -227.11542247619582
      },
      version: '481',
      inputs: [
        {
          key: 'datasets',
          renderTypeList: [FlowNodeInputTypeEnum.selectDataset, FlowNodeInputTypeEnum.reference],
          label: 'core.module.input.label.Select dataset',
          value: selectedDatasets,
          valueType: WorkflowIOValueTypeEnum.selectDataset,
          list: [],
          required: true
        },
        {
          key: 'similarity',
          renderTypeList: [FlowNodeInputTypeEnum.selectDatasetParamsModal],
          label: '',
          value: formData.dataset.similarity,
          valueType: WorkflowIOValueTypeEnum.number
        },
        {
          key: 'limit',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.dataset.limit,
          valueType: WorkflowIOValueTypeEnum.number
        },
        {
          key: 'searchMode',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.searchMode
        },
        {
          key: 'usingReRank',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: formData.dataset.usingReRank
        },
        {
          key: 'datasetSearchUsingExtensionQuery',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: formData.dataset.datasetSearchUsingExtensionQuery
        },
        {
          key: 'datasetSearchExtensionModel',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.datasetSearchExtensionModel
        },
        {
          key: 'datasetSearchExtensionBg',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.datasetSearchExtensionBg
        },
        {
          key: 'userChatInput',
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          valueType: WorkflowIOValueTypeEnum.string,
          label: '用户问题',
          required: true,
          toolDescription: '需要检索的内容',
          value: question
        }
      ],
      outputs: DatasetSearchModule.outputs
    };
  }

  // Start, AiChat
  function simpleChatTemplate(formData: AppSimpleEditFormType): WorkflowType {
    return {
      nodes: [aiChatTemplate(formData)],
      edges: [
        {
          source: workflowStartNodeId,
          target: aiChatNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }
  // Start, Dataset search, AiChat
  function datasetTemplate(formData: AppSimpleEditFormType): WorkflowType {
    return {
      nodes: [
        aiChatTemplate(formData),
        datasetNodeTemplate(formData, [workflowStartNodeId, 'userChatInput'])
      ],
      edges: [
        {
          source: workflowStartNodeId,
          target: datasetNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${datasetNodeId}-target-left`
        },
        {
          source: datasetNodeId,
          target: aiChatNodeId,
          sourceHandle: `${datasetNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }
  function toolTemplates(formData: AppSimpleEditFormType): WorkflowType {
    const toolNodeId = getNanoid(6);

    // Dataset tool config
    const datasetTool: WorkflowType | null =
      selectedDatasets.length > 0
        ? {
            nodes: [datasetNodeTemplate(formData, '')],
            edges: [
              {
                source: toolNodeId,
                target: datasetNodeId,
                sourceHandle: 'selectedTools',
                targetHandle: 'selectedTools'
              }
            ]
          }
        : null;
    // Read file tool config
    const readFileTool: WorkflowType | null = data.chatConfig.fileSelectConfig?.canSelectFile
      ? {
          nodes: [
            {
              nodeId: ReadFilesNodes.id,
              name: t(ReadFilesNodes.name),
              intro: t(ReadFilesNodes.intro),
              avatar: ReadFilesNodes.avatar,
              flowNodeType: ReadFilesNodes.flowNodeType,
              showStatus: true,
              position: {
                x: 974.6209854328943,
                y: 587.6378828744465
              },
              version: '489',
              inputs: [
                {
                  key: NodeInputKeyEnum.fileUrlList,
                  renderTypeList: [FlowNodeInputTypeEnum.reference],
                  valueType: WorkflowIOValueTypeEnum.arrayString,
                  label: t('app:workflow.file_url'),
                  value: [workflowStartNodeId, 'userFiles']
                }
              ],
              outputs: ReadFilesNodes.outputs
            }
          ],
          edges: [
            {
              source: toolNodeId,
              target: ReadFilesNodes.id,
              sourceHandle: 'selectedTools',
              targetHandle: 'selectedTools'
            }
          ]
        }
      : null;

    // Computed tools config
    const pluginTool: WorkflowType[] = formData.selectedTools.map((tool, i) => {
      const nodeId = getNanoid(6);
      return {
        nodes: [
          {
            nodeId,
            id: tool.id,
            pluginId: tool.pluginId,
            name: tool.name,
            intro: tool.intro,
            avatar: tool.avatar,
            flowNodeType: tool.flowNodeType,
            showStatus: tool.showStatus,
            position: {
              x: 500 + 500 * (i + 1),
              y: 545
            },
            version: tool.version,
            inputs: tool.inputs,
            outputs: tool.outputs
          }
        ],
        edges: [
          {
            source: toolNodeId,
            target: nodeId,
            sourceHandle: 'selectedTools',
            targetHandle: 'selectedTools'
          }
        ]
      };
    });

    const config: WorkflowType = {
      nodes: [
        {
          nodeId: toolNodeId,
          name: ToolModule.name,
          intro: ToolModule.intro,
          avatar: ToolModule.avatar,
          flowNodeType: ToolModule.flowNodeType,
          showStatus: true,
          position: {
            x: 1062.1738942532802,
            y: -223.65033022650476
          },
          version: ToolModule.version,
          inputs: [
            {
              key: 'model',
              renderTypeList: [
                FlowNodeInputTypeEnum.settingLLMModel,
                FlowNodeInputTypeEnum.reference
              ],
              label: 'core.module.input.label.aiModel',
              valueType: WorkflowIOValueTypeEnum.string,
              llmModelType: 'all',
              value: formData.aiSettings.model
            },
            {
              key: 'temperature',
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              value: formData.aiSettings.temperature,
              valueType: WorkflowIOValueTypeEnum.number,
              min: 0,
              max: 10,
              step: 1
            },
            {
              key: 'maxToken',
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              value: formData.aiSettings.maxToken,
              valueType: WorkflowIOValueTypeEnum.number,
              min: 100,
              max: 4000,
              step: 50
            },
            {
              key: 'systemPrompt',
              renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
              max: 3000,
              valueType: WorkflowIOValueTypeEnum.string,
              label: 'core.ai.Prompt',
              description: 'core.app.tip.chatNodeSystemPromptTip',
              placeholder: 'core.app.tip.chatNodeSystemPromptTip',
              value: formData.aiSettings.systemPrompt
            },
            {
              key: 'history',
              renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
              valueType: WorkflowIOValueTypeEnum.chatHistory,
              label: 'core.module.input.label.chat history',
              required: true,
              min: 0,
              max: 30,
              value: formData.aiSettings.maxHistories
            },
            {
              key: 'userChatInput',
              renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
              valueType: WorkflowIOValueTypeEnum.string,
              label: '用户问题',
              required: true,
              value: [workflowStartNodeId, 'userChatInput']
            },
            {
              key: NodeInputKeyEnum.aiChatVision,
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              valueType: WorkflowIOValueTypeEnum.boolean,
              value: true
            }
          ],
          outputs: ToolModule.outputs
        },
        // tool nodes
        ...(datasetTool ? datasetTool.nodes : []),
        ...(readFileTool ? readFileTool.nodes : []),
        ...pluginTool.map((tool) => tool.nodes).flat()
      ],
      edges: [
        {
          source: workflowStartNodeId,
          target: toolNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${toolNodeId}-target-left`
        },
        // tool edges
        ...(datasetTool ? datasetTool.edges : []),
        ...(readFileTool ? readFileTool.edges : []),
        ...pluginTool.map((tool) => tool.edges).flat()
      ]
    };

    return config;
  }

  const workflow = (() => {
    if (data.selectedTools.length > 0 || data.chatConfig.fileSelectConfig?.canSelectFile)
      return toolTemplates(data);
    if (selectedDatasets.length > 0) return datasetTemplate(data);
    return simpleChatTemplate(data);
  })();

  return {
    nodes: [systemConfigTemplate(), workflowStartTemplate(), ...workflow.nodes],
    edges: workflow.edges,
    chatConfig: data.chatConfig
  };
}

export const getSystemVariables = (t: TFunction): EditorVariablePickerType[] => {
  return [
    {
      key: 'appId',
      label: t('common:core.module.http.AppId'),
      required: true,
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: 'chatId',
      label: t('common:core.module.http.ChatId'),
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: 'responseChatItemId',
      label: t('common:core.module.http.ResponseChatItemId'),
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: 'histories',
      label: t('common:core.module.http.Histories'),
      required: true,
      valueType: WorkflowIOValueTypeEnum.chatHistory
    },
    {
      key: 'cTime',
      label: t('common:core.module.http.Current time'),
      required: true,
      valueType: WorkflowIOValueTypeEnum.string
    }
  ];
};

export const getAppQGuideCustomURL = (appDetail: AppDetailType | AppSchema): string => {
  return (
    appDetail?.modules
      .find((m) => m.flowNodeType === FlowNodeTypeEnum.systemConfig)
      ?.inputs.find((i) => i.key === NodeInputKeyEnum.chatInputGuide)?.value.customUrl || ''
  );
};
