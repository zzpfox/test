import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../node/constant';
import { FlowNodeTemplateType } from '../../type/node';
import {
  WorkflowIOValueTypeEnum,
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  FlowNodeTemplateTypeEnum
} from '../../constants';
import {
  Input_Template_SettingAiModel,
  Input_Template_Dataset_Quote,
  Input_Template_History,
  Input_Template_System_Prompt,
  Input_Template_UserChatInput,
  Input_Template_Text_Quote
} from '../input';
import { chatNodeSystemPromptTip } from '../tip';
import { getHandleConfig } from '../utils';
import { i18nT } from '../../../../../web/i18n/utils';

export const AiChatModule: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.chatNode,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.chatNode,
  sourceHandle: getHandleConfig(true, true, true, true),
  targetHandle: getHandleConfig(true, true, true, true),
  avatar: 'core/workflow/template/aiChat',
  name: i18nT('workflow:template.ai_chat'),
  intro: i18nT('workflow:template.ai_chat_intro'),
  showStatus: true,
  isTool: true,
  version: '481',
  inputs: [
    Input_Template_SettingAiModel,
    // --- settings modal
    {
      key: NodeInputKeyEnum.aiChatTemperature,
      renderTypeList: [FlowNodeInputTypeEnum.hidden], // Set in the pop-up window
      label: '',
      value: 0,
      valueType: WorkflowIOValueTypeEnum.number
    },
    {
      key: NodeInputKeyEnum.aiChatMaxToken,
      renderTypeList: [FlowNodeInputTypeEnum.hidden], // Set in the pop-up window
      label: '',
      value: 2000,
      valueType: WorkflowIOValueTypeEnum.number
    },
    {
      key: NodeInputKeyEnum.aiChatIsResponseText,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      value: true,
      valueType: WorkflowIOValueTypeEnum.boolean
    },
    {
      key: NodeInputKeyEnum.aiChatQuoteTemplate,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: NodeInputKeyEnum.aiChatQuotePrompt,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: NodeInputKeyEnum.aiChatVision,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.boolean,
      value: true
    },
    // settings modal ---
    {
      ...Input_Template_System_Prompt,
      label: 'core.ai.Prompt',
      description: chatNodeSystemPromptTip,
      placeholder: chatNodeSystemPromptTip
    },
    Input_Template_History,
    Input_Template_Dataset_Quote,
    Input_Template_Text_Quote,
    { ...Input_Template_UserChatInput, toolDescription: '用户问题' }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.history,
      key: NodeOutputKeyEnum.history,
      required: true,
      label: 'core.module.output.label.New context',
      description: 'core.module.output.description.New context',
      valueType: WorkflowIOValueTypeEnum.chatHistory,
      type: FlowNodeOutputTypeEnum.static
    },
    {
      id: NodeOutputKeyEnum.answerText,
      key: NodeOutputKeyEnum.answerText,
      required: true,
      label: 'core.module.output.label.Ai response content',
      description: 'core.module.output.description.Ai response content',
      valueType: WorkflowIOValueTypeEnum.string,
      type: FlowNodeOutputTypeEnum.static
    }
  ]
};
