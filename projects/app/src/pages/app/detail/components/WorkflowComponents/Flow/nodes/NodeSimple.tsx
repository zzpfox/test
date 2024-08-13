import React, { useMemo } from 'react';
import { NodeProps } from 'reactflow';
import NodeCard from './render/NodeCard';
import { FlowNodeItemType } from '@fastgpt/global/core/workflow/type/node.d';
import Container from '../components/Container';
import RenderInput from './render/RenderInput';
import RenderOutput from './render/RenderOutput';
import RenderToolInput from './render/RenderToolInput';
import { useTranslation } from 'next-i18next';
import { FlowNodeOutputTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import IOTitle from '../components/IOTitle';
import { useContextSelector } from 'use-context-selector';
import { WorkflowContext } from '../../context';

const NodeSimple = ({
  data,
  selected,
  minW = '350px',
  maxW
}: NodeProps<FlowNodeItemType> & { minW?: string | number; maxW?: string | number }) => {
  const { t } = useTranslation();
  const splitToolInputs = useContextSelector(WorkflowContext, (ctx) => ctx.splitToolInputs);
  const { nodeId, inputs, outputs } = data;
  const { isTool, commonInputs } = splitToolInputs(inputs, nodeId);

  const filterHiddenInputs = useMemo(() => commonInputs.filter((item) => true), [commonInputs]);

  return (
    <NodeCard minW={minW} maxW={maxW} selected={selected} {...data}>
      {isTool && (
        <>
          <Container>
            <RenderToolInput nodeId={nodeId} inputs={inputs} />
          </Container>
        </>
      )}
      {filterHiddenInputs.length > 0 && (
        <>
          <Container>
            <IOTitle
              text={t('common:common.Input')}
              inputExplanationUrl={data.inputExplanationUrl}
            />
            <RenderInput nodeId={nodeId} flowInputList={commonInputs} />
          </Container>
        </>
      )}
      {outputs.filter((output) => output.type !== FlowNodeOutputTypeEnum.hidden).length > 0 && (
        <>
          <Container>
            <IOTitle text={t('common:common.Output')} />
            <RenderOutput nodeId={nodeId} flowOutputList={outputs} />
          </Container>
        </>
      )}
    </NodeCard>
  );
};
export default React.memo(NodeSimple);
