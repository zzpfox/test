import { FlowNodeInputTypeEnum } from '../node/constant';

export enum SseResponseEventEnum {
  error = 'error',
  answer = 'answer', // animation stream
  fastAnswer = 'fastAnswer', // direct answer text, not animation
  flowNodeStatus = 'flowNodeStatus', // update node status

  toolCall = 'toolCall', // tool start
  toolParams = 'toolParams', // tool params return
  toolResponse = 'toolResponse', // tool response return
  flowResponses = 'flowResponses', // sse response request
  updateVariables = 'updateVariables'
}

export enum DispatchNodeResponseKeyEnum {
  skipHandleId = 'skipHandleId', // skip handle id
  nodeResponse = 'responseData', // run node response
  nodeDispatchUsages = 'nodeDispatchUsages', // the node bill.
  childrenResponses = 'childrenResponses', // Some nodes make recursive calls that need to be returned
  toolResponses = 'toolResponses', // The result is passed back to the tool node for use
  assistantResponses = 'assistantResponses' // assistant response
}

export const needReplaceReferenceInputTypeList = [
  FlowNodeInputTypeEnum.reference,
  FlowNodeInputTypeEnum.settingDatasetQuotePrompt,
  FlowNodeInputTypeEnum.addInputParam,
  FlowNodeInputTypeEnum.custom
] as string[];
