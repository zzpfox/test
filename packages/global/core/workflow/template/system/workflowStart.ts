import { FlowNodeOutputTypeEnum, FlowNodeTypeEnum } from '../../node/constant';
import { FlowNodeTemplateType } from '../../type/node.d';
import {
  WorkflowIOValueTypeEnum,
  NodeOutputKeyEnum,
  FlowNodeTemplateTypeEnum
} from '../../constants';
import { getHandleConfig } from '../utils';
import { Input_Template_UserChatInput } from '../input';
import { i18nT } from '../../../../../web/i18n/utils';
import { FlowNodeOutputItemType } from '../../type/io';

export const userFilesInput: FlowNodeOutputItemType = {
  id: NodeOutputKeyEnum.userFiles,
  key: NodeOutputKeyEnum.userFiles,
  label: i18nT('app:workflow.user_file_input'),
  description: i18nT('app:workflow.user_file_input_desc'),
  type: FlowNodeOutputTypeEnum.static,
  valueType: WorkflowIOValueTypeEnum.arrayString
};

export const WorkflowStart: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.workflowStart,
  templateType: FlowNodeTemplateTypeEnum.systemInput,
  flowNodeType: FlowNodeTypeEnum.workflowStart,
  sourceHandle: getHandleConfig(false, true, false, false),
  targetHandle: getHandleConfig(false, false, false, false),
  avatar: 'core/workflow/template/workflowStart',
  name: i18nT('workflow:template.workflow_start'),
  intro: '',
  forbidDelete: true,
  unique: true,
  version: '481',
  inputs: [{ ...Input_Template_UserChatInput, toolDescription: '用户问题' }],
  outputs: [
    {
      id: NodeOutputKeyEnum.userChatInput,
      key: NodeOutputKeyEnum.userChatInput,
      label: i18nT('common:core.module.input.label.user question'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    }
  ]
};

export const isWorkflowStartOutput = (key?: string) =>
  !!WorkflowStart.outputs.find((output) => output.key === key);
