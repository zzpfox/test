import { markdownProcess } from '@fastgpt/global/common/string/markdown';
import { uploadMongoImg } from '../image/controller';
import { MongoImageTypeEnum } from '@fastgpt/global/common/file/image/constants';
import { addHours } from 'date-fns';

import { WorkerNameEnum, runWorker } from '../../../worker/utils';
import fs from 'fs';
import { detectFileEncoding } from '@fastgpt/global/common/file/tools';
import type { ReadFileResponse } from '../../../worker/readFile/type';

export type readRawTextByLocalFileParams = {
  teamId: string;
  path: string;
  metadata?: Record<string, any>;
};
export const readRawTextByLocalFile = async (params: readRawTextByLocalFileParams) => {
  const { path } = params;

  const extension = path?.split('.')?.pop()?.toLowerCase() || '';

  const buffer = fs.readFileSync(path);
  const encoding = detectFileEncoding(buffer);

  const { rawText } = await readRawContentByFileBuffer({
    extension,
    isQAImport: false,
    teamId: params.teamId,
    encoding,
    buffer,
    metadata: params.metadata
  });

  return {
    rawText
  };
};

export const readRawContentByFileBuffer = async ({
  extension,
  isQAImport,
  teamId,
  buffer,
  encoding,
  metadata
}: {
  isQAImport?: boolean;
  extension: string;
  teamId: string;
  buffer: Buffer;
  encoding: string;
  metadata?: Record<string, any>;
}) => {
  // Upload image in markdown
  const matchMdImgTextAndUpload = ({
    teamId,
    md,
    metadata
  }: {
    md: string;
    teamId: string;
    metadata?: Record<string, any>;
  }) =>
    markdownProcess({
      rawText: md,
      uploadImgController: (base64Img) =>
        uploadMongoImg({
          type: MongoImageTypeEnum.collectionImage,
          base64Img,
          teamId,
          metadata,
          expiredTime: addHours(new Date(), 1)
        })
    });

  let { rawText, formatText } = await runWorker<ReadFileResponse>(WorkerNameEnum.readFile, {
    extension,
    encoding,
    buffer
  });

  // markdown data format
  if (['md', 'html', 'docx'].includes(extension)) {
    rawText = await matchMdImgTextAndUpload({
      teamId: teamId,
      md: rawText,
      metadata: metadata
    });
  }

  if (['csv', 'xlsx'].includes(extension)) {
    // qa data
    if (isQAImport) {
      rawText = rawText || '';
    } else {
      rawText = formatText || '';
    }
  }

  return { rawText };
};
