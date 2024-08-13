import { getErrText } from '../error/utils';
import { replaceRegChars } from './tools';

export const CUSTOM_SPLIT_SIGN = '-----CUSTOM_SPLIT_SIGN-----';

type SplitProps = {
  text: string;
  chunkLen: number;
  overlapRatio?: number;
  customReg?: string[];
};
export type TextSplitProps = Omit<SplitProps, 'text' | 'chunkLen'> & {
  chunkLen?: number;
};

type SplitResponse = {
  chunks: string[];
  chars: number;
};

// 判断字符串是否为markdown的表格形式
const strIsMdTable = (str: string) => {
  // 检查是否包含表格分隔符 |
  if (!str.includes('|')) {
    return false;
  }

  const lines = str.split('\n');

  // 检查表格是否至少有两行
  if (lines.length < 2) {
    return false;
  }

  // 检查表头行是否包含 |
  const headerLine = lines[0].trim();
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
    return false;
  }

  // 检查分隔行是否由 | 和 - 组成
  const separatorLine = lines[1].trim();
  const separatorRegex = /^(\|[\s:]*-+[\s:]*)+\|$/;
  if (!separatorRegex.test(separatorLine)) {
    return false;
  }

  // 检查数据行是否包含 |
  for (let i = 2; i < lines.length; i++) {
    const dataLine = lines[i].trim();
    if (dataLine && (!dataLine.startsWith('|') || !dataLine.endsWith('|'))) {
      return false;
    }
  }

  return true;
};
const markdownTableSplit = (props: SplitProps): SplitResponse => {
  let { text = '', chunkLen } = props;
  const splitText2Lines = text.split('\n');
  const header = splitText2Lines[0];
  const headerSize = header.split('|').length - 2;

  const mdSplitString = `| ${new Array(headerSize > 0 ? headerSize : 1)
    .fill(0)
    .map(() => '---')
    .join(' | ')} |`;

  const chunks: string[] = [];
  let chunk = `${header}
${mdSplitString}
`;

  for (let i = 2; i < splitText2Lines.length; i++) {
    if (chunk.length + splitText2Lines[i].length > chunkLen * 1.2) {
      chunks.push(chunk);
      chunk = `${header}
${mdSplitString}
`;
    }
    chunk += `${splitText2Lines[i]}\n`;
  }

  if (chunk) {
    chunks.push(chunk);
  }

  return {
    chunks,
    chars: chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  };
};

const commonSplit = (props: SplitProps): SplitResponse => {
  let { text = '', chunkLen, overlapRatio = 0.2, customReg = [] } = props;

  const splitMarker = 'SPLIT_HERE_SPLIT_HERE';
  const codeBlockMarker = 'CODE_BLOCK_LINE_MARKER';
  const overlapLen = Math.round(chunkLen * overlapRatio);

  // replace code block all \n to codeBlockMarker
  text = text.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, function (match) {
    return match.replace(/\n/g, codeBlockMarker);
  });
  // replace invalid \n
  text = text.replace(/(\r?\n|\r){3,}/g, '\n\n\n');

  // The larger maxLen is, the next sentence is less likely to trigger splitting
  const stepReges: { reg: RegExp; maxLen: number }[] = [
    ...customReg.map((text) => ({
      reg: new RegExp(`(${replaceRegChars(text)})`, 'g'),
      maxLen: chunkLen * 1.4
    })),
    { reg: /^(#\s[^\n]+)\n/gm, maxLen: chunkLen * 1.2 },
    { reg: /^(##\s[^\n]+)\n/gm, maxLen: chunkLen * 1.2 },
    { reg: /^(###\s[^\n]+)\n/gm, maxLen: chunkLen * 1.2 },
    { reg: /^(####\s[^\n]+)\n/gm, maxLen: chunkLen * 1.2 },

    { reg: /([\n]([`~]))/g, maxLen: chunkLen * 4 }, // code block
    { reg: /([\n](?!\s*[\*\-|>0-9]))/g, maxLen: chunkLen * 2 }, // 增大块，尽可能保证它是一个完整的段落。 (?![\*\-|>`0-9]): markdown special char
    { reg: /([\n])/g, maxLen: chunkLen * 1.2 },
    // ------ There's no overlap on the top
    { reg: /([。]|([a-zA-Z])\.\s)/g, maxLen: chunkLen * 1.2 },
    { reg: /([！]|!\s)/g, maxLen: chunkLen * 1.2 },
    { reg: /([？]|\?\s)/g, maxLen: chunkLen * 1.4 },
    { reg: /([；]|;\s)/g, maxLen: chunkLen * 1.6 },
    { reg: /([，]|,\s)/g, maxLen: chunkLen * 2 }
  ];

  const customRegLen = customReg.length;
  const checkIsCustomStep = (step: number) => step < customRegLen;
  const checkIsMarkdownSplit = (step: number) => step >= customRegLen && step <= 3 + customRegLen;
  const checkIndependentChunk = (step: number) => step >= customRegLen && step <= 4 + customRegLen;
  const checkForbidOverlap = (step: number) => step <= 6 + customRegLen;

  // if use markdown title split, Separate record title
  const getSplitTexts = ({ text, step }: { text: string; step: number }) => {
    if (step >= stepReges.length) {
      return [
        {
          text,
          title: ''
        }
      ];
    }

    const isCustomStep = checkIsCustomStep(step);
    const isMarkdownSplit = checkIsMarkdownSplit(step);
    const independentChunk = checkIndependentChunk(step);

    const { reg } = stepReges[step];

    const splitTexts = text
      .replace(
        reg,
        (() => {
          if (isCustomStep) return splitMarker;
          if (independentChunk) return `${splitMarker}$1`;
          return `$1${splitMarker}`;
        })()
      )
      .split(`${splitMarker}`)
      .filter((part) => part.trim());

    return splitTexts
      .map((text) => {
        const matchTitle = isMarkdownSplit ? text.match(reg)?.[0] || '' : '';

        return {
          text: isMarkdownSplit ? text.replace(matchTitle, '') : text,
          title: matchTitle
        };
      })
      .filter((item) => item.text.trim());
  };

  /* Gets the overlap at the end of a text as the beginning of the next block */
  const getOneTextOverlapText = ({ text, step }: { text: string; step: number }): string => {
    const forbidOverlap = checkForbidOverlap(step);
    const maxOverlapLen = chunkLen * 0.4;

    // step >= stepReges.length: Do not overlap incomplete sentences
    if (forbidOverlap || overlapLen === 0 || step >= stepReges.length) return '';

    const splitTexts = getSplitTexts({ text, step });
    let overlayText = '';

    for (let i = splitTexts.length - 1; i >= 0; i--) {
      const currentText = splitTexts[i].text;
      const newText = currentText + overlayText;
      const newTextLen = newText.length;

      if (newTextLen > overlapLen) {
        if (newTextLen > maxOverlapLen) {
          const text = getOneTextOverlapText({ text: newText, step: step + 1 });
          return text || overlayText;
        }
        return newText;
      }

      overlayText = newText;
    }
    return overlayText;
  };

  const splitTextRecursively = ({
    text = '',
    step,
    lastText,
    mdTitle = ''
  }: {
    text: string;
    step: number;
    lastText: string;
    mdTitle: string;
  }): string[] => {
    const independentChunk = checkIndependentChunk(step);
    const isCustomStep = checkIsCustomStep(step);

    // oversize
    if (step >= stepReges.length) {
      if (text.length < chunkLen * 3) {
        return [text];
      }
      // use slice-chunkLen to split text
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkLen - overlapLen) {
        chunks.push(`${mdTitle}${text.slice(i, i + chunkLen)}`);
      }
      return chunks;
    }

    // split text by special char
    const splitTexts = getSplitTexts({ text, step });

    const maxLen = splitTexts.length > 1 ? stepReges[step].maxLen : chunkLen;
    const minChunkLen = chunkLen * 0.7;
    const miniChunkLen = 30;
    // console.log(splitTexts, stepReges[step].reg);

    const chunks: string[] = [];
    for (let i = 0; i < splitTexts.length; i++) {
      const item = splitTexts[i];
      const currentTitle = `${mdTitle}${item.title}`;

      const currentText = item.text;
      const currentTextLen = currentText.length;
      const lastTextLen = lastText.length;
      const newText = lastText + currentText;
      const newTextLen = lastTextLen + currentTextLen;

      // newText is too large(now, The lastText must be smaller than chunkLen)
      if (newTextLen > maxLen) {
        // lastText greater minChunkLen, direct push it to chunks, not add to next chunk. (large lastText)
        if (lastTextLen > minChunkLen) {
          chunks.push(`${currentTitle}${lastText}`);
          lastText = getOneTextOverlapText({ text: lastText, step }); // next chunk will start with overlayText
          i--;

          continue;
        }

        // split new Text, split chunks must will greater 1 (small lastText)
        const innerChunks = splitTextRecursively({
          text: newText,
          step: step + 1,
          lastText: '',
          mdTitle: currentTitle
        });
        const lastChunk = innerChunks[innerChunks.length - 1];
        // last chunk is too small, concat it to lastText(next chunk start)
        if (!independentChunk && lastChunk.length < minChunkLen) {
          chunks.push(...innerChunks.slice(0, -1));
          lastText = lastChunk;
        } else {
          chunks.push(...innerChunks);
          // compute new overlapText
          lastText = getOneTextOverlapText({
            text: lastChunk,
            step
          });
        }
        continue;
      }

      // size less than chunkLen, push text to last chunk. now, text definitely less than maxLen
      lastText = newText;

      // markdown paragraph block: Direct addition; If the chunk size reaches, add a chunk
      if (
        isCustomStep ||
        (independentChunk && newTextLen > miniChunkLen) ||
        newTextLen >= chunkLen
      ) {
        chunks.push(`${currentTitle}${lastText}`);

        lastText = getOneTextOverlapText({ text: lastText, step });
      }
    }

    /* If the last chunk is independent, it needs to be push chunks. */
    if (lastText && chunks[chunks.length - 1] && !chunks[chunks.length - 1].endsWith(lastText)) {
      if (lastText.length < chunkLen * 0.4) {
        chunks[chunks.length - 1] = chunks[chunks.length - 1] + lastText;
      } else {
        chunks.push(`${mdTitle}${lastText}`);
      }
    } else if (lastText && chunks.length === 0) {
      chunks.push(lastText);
    }

    return chunks;
  };

  try {
    const chunks = splitTextRecursively({
      text,
      step: 0,
      lastText: '',
      mdTitle: ''
    }).map((chunk) => chunk?.replaceAll(codeBlockMarker, '\n') || ''); // restore code block

    const chars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    return {
      chunks,
      chars
    };
  } catch (err) {
    throw new Error(getErrText(err));
  }
};

/**
 * text split into chunks
 * chunkLen - one chunk len. max: 3500
 * overlapLen - The size of the before and after Text
 * chunkLen > overlapLen
 * markdown
 */
export const splitText2Chunks = (props: SplitProps): SplitResponse => {
  let { text = '' } = props;
  const start = Date.now();
  const splitWithCustomSign = text.split(CUSTOM_SPLIT_SIGN);

  const splitResult = splitWithCustomSign.map((item) => {
    if (strIsMdTable(item)) {
      return markdownTableSplit(props);
    }

    return commonSplit(props);
  });

  return {
    chunks: splitResult.map((item) => item.chunks).flat(),
    chars: splitResult.reduce((sum, item) => sum + item.chars, 0)
  };
};
