import { i18nT } from '../../../web/i18n/utils';

/* mongo fs bucket */
export enum BucketNameEnum {
  dataset = 'dataset',
  chat = 'chat'
}
export const bucketNameMap = {
  [BucketNameEnum.dataset]: {
    label: i18nT('file:bucket_file'),
    previewExpireMinutes: 30 // 30 minutes
  },
  [BucketNameEnum.chat]: {
    label: i18nT('file:bucket_chat'),
    previewExpireMinutes: 7 * 24 * 60 // 7 days
  }
};

export const ReadFileBaseUrl = '/api/common/file/read';

export const documentFileType = '.txt, .docx, .csv, .xlsx, .pdf, .md, .html, .pptx';
