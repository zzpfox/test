import { useState, useRef, useTransition } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import VariableLabelPickerPlugin from './plugins/VariableLabelPickerPlugin';
import { Box } from '@chakra-ui/react';
import styles from './index.module.scss';
import VariablePlugin from './plugins/VariablePlugin';
import { VariableNode } from './plugins/VariablePlugin/node';
import { EditorState, LexicalEditor } from 'lexical';
import OnBlurPlugin from './plugins/OnBlurPlugin';
import MyIcon from '../../Icon';
import { EditorVariableLabelPickerType, EditorVariablePickerType } from './type.d';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import FocusPlugin from './plugins/FocusPlugin';
import { textToEditorState } from './utils';
import { MaxLengthPlugin } from './plugins/MaxLengthPlugin';
import { VariableLabelNode } from './plugins/VariableLabelPlugin/node';
import VariableLabelPlugin from './plugins/VariableLabelPlugin';
import { useDeepCompareEffect } from 'ahooks';
import VariablePickerPlugin from './plugins/VariablePickerPlugin';

export default function Editor({
  h = 200,
  maxLength,
  showResize = true,
  showOpenModal = true,
  onOpenModal,
  variables,
  variableLabels,
  onChange,
  onBlur,
  value,
  placeholder = '',
  isFlow,
  bg = 'white'
}: {
  h?: number;
  maxLength?: number;
  showResize?: boolean;
  showOpenModal?: boolean;
  onOpenModal?: () => void;
  variables: EditorVariablePickerType[];
  variableLabels: EditorVariableLabelPickerType[];
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
  onBlur?: (editor: LexicalEditor) => void;
  value?: string;
  placeholder?: string;
  isFlow?: boolean;
  bg?: string;
}) {
  const [key, setKey] = useState(getNanoid(6));
  const [_, startSts] = useTransition();
  const [height, setHeight] = useState(h);
  const [focus, setFocus] = useState(false);

  const initialConfig = {
    namespace: 'promptEditor',
    nodes: [VariableNode, VariableLabelNode],
    editorState: textToEditorState(value),
    onError: (error: Error) => {
      throw error;
    }
  };

  const initialY = useRef(0);
  const handleMouseDown = (e: React.MouseEvent) => {
    initialY.current = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - initialY.current;
      setHeight((prevHeight) => (prevHeight + deltaY < h * 0.5 ? h * 0.5 : prevHeight + deltaY));
      initialY.current = e.clientY;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useDeepCompareEffect(() => {
    if (focus) return;
    setKey(getNanoid(6));
  }, [value, variables, variableLabels]);

  return (
    <Box
      position={'relative'}
      width={'full'}
      h={`${height}px`}
      cursor={'text'}
      color={'myGray.700'}
      bg={focus ? 'white' : bg}
    >
      <LexicalComposer initialConfig={initialConfig} key={key}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={isFlow ? styles.contentEditable_isFlow : styles.contentEditable}
            />
          }
          placeholder={
            <Box
              position={'absolute'}
              top={0}
              left={0}
              right={0}
              bottom={0}
              py={3}
              px={4}
              pointerEvents={'none'}
              overflow={'overlay'}
            >
              <Box
                color={'myGray.400'}
                fontSize={'mini'}
                userSelect={'none'}
                whiteSpace={'pre-wrap'}
                wordBreak={'break-all'}
                h={'100%'}
              >
                {placeholder}
              </Box>
            </Box>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <MaxLengthPlugin maxLength={maxLength || 999999} />
        <FocusPlugin focus={focus} setFocus={setFocus} />
        <OnChangePlugin
          onChange={(editorState, editor) => {
            startSts(() => {
              onChange?.(editorState, editor);
            });
          }}
        />
        <VariableLabelPlugin variables={variableLabels} />
        <VariableLabelPickerPlugin variables={variableLabels} isFocus={focus} />
        <VariablePlugin variables={variables} />
        <VariablePickerPlugin variables={variableLabels.length > 0 ? [] : variables} />
        <OnBlurPlugin onBlur={onBlur} />
      </LexicalComposer>
      {showResize && (
        <Box
          position={'absolute'}
          right={'0'}
          bottom={'-1'}
          zIndex={9}
          cursor={'ns-resize'}
          px={'2px'}
          onMouseDown={handleMouseDown}
        >
          <MyIcon name={'common/editor/resizer'} width={'14px'} height={'14px'} />
        </Box>
      )}
      {showOpenModal && (
        <Box
          zIndex={10}
          position={'absolute'}
          bottom={0}
          right={2}
          cursor={'pointer'}
          onClick={onOpenModal}
        >
          <MyIcon name={'common/fullScreenLight'} w={'14px'} color={'myGray.600'} />
        </Box>
      )}
    </Box>
  );
}
