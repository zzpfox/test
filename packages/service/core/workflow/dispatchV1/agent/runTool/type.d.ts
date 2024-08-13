import { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type';
import { NodeInputKeyEnum, NodeOutputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { FlowNodeInputItemType } from '@fastgpt/global/core/workflow/node/type';
import type {
  ModuleDispatchProps,
  DispatchNodeResponseType
} from '@fastgpt/global/core/workflow/runtime/type';
import type { RuntimeNodeItemType } from '@fastgpt/global/core/workflow/runtime/type';
import { ChatNodeUsageType } from '@fastgpt/global/support/wallet/bill/type';
import type { DispatchFlowResponse } from '../../type.d';
import { AIChatItemValueItemType, ChatItemValueItemType } from '@fastgpt/global/core/chat/type';

export type DispatchToolModuleProps = ModuleDispatchProps<{
  [NodeInputKeyEnum.history]?: ChatItemType[];
  [NodeInputKeyEnum.aiModel]: string;
  [NodeInputKeyEnum.aiSystemPrompt]: string;
  [NodeInputKeyEnum.userChatInput]: string;
}>;

export type RunToolResponse = {
  dispatchFlowResponse: DispatchFlowResponse[];
  totalTokens: number;
  completeMessages?: ChatCompletionMessageParam[];
  assistantResponses?: AIChatItemValueItemType[];
};
export type ToolModuleItemType = RuntimeNodeItemType & {
  toolParams: RuntimeNodeItemType['inputs'];
};
