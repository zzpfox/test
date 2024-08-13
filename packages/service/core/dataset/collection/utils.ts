import type { CollectionWithDatasetType } from '@fastgpt/global/core/dataset/type.d';
import { MongoDatasetCollection } from './schema';
import type { ParentTreePathItemType } from '@fastgpt/global/common/parentFolder/type.d';
import { splitText2Chunks } from '@fastgpt/global/common/string/textSplitter';
import { MongoDatasetTraining } from '../training/schema';
import { urlsFetch } from '../../../common/string/cheerio';
import {
  DatasetCollectionTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import { hashStr } from '@fastgpt/global/common/string/tools';
import { ClientSession } from '../../../common/mongo';
import { PushDatasetDataResponse } from '@fastgpt/global/core/dataset/api';
import { MongoDatasetCollectionTags } from '../tag/schema';

/**
 * get all collection by top collectionId
 */
export async function findCollectionAndChild({
  teamId,
  datasetId,
  collectionId,
  fields = '_id parentId name metadata'
}: {
  teamId: string;
  datasetId: string;
  collectionId: string;
  fields?: string;
}) {
  async function find(id: string) {
    // find children
    const children = await MongoDatasetCollection.find(
      { teamId, datasetId, parentId: id },
      fields
    ).lean();

    let collections = children;

    for (const child of children) {
      const grandChildrenIds = await find(child._id);
      collections = collections.concat(grandChildrenIds);
    }

    return collections;
  }
  const [collection, childCollections] = await Promise.all([
    MongoDatasetCollection.findById(collectionId, fields).lean(),
    find(collectionId)
  ]);

  if (!collection) {
    return Promise.reject('Collection not found');
  }

  return [collection, ...childCollections];
}

export function getCollectionUpdateTime({ name, time }: { time?: Date; name: string }) {
  if (time) return time;
  if (name.startsWith('手动') || ['manual', 'mark'].includes(name)) return new Date('2999/9/9');
  return new Date();
}

/**
 * Get collection raw text by Collection or collectionId
 */
export const getCollectionAndRawText = async ({
  collectionId,
  collection,
  newRawText
}: {
  collectionId?: string;
  collection?: CollectionWithDatasetType;
  newRawText?: string;
}) => {
  const col = await (async () => {
    if (collection) return collection;
    if (collectionId) {
      return (await MongoDatasetCollection.findById(collectionId).populate(
        'datasetId'
      )) as CollectionWithDatasetType;
    }

    return null;
  })();

  if (!col) {
    return Promise.reject('Collection not found');
  }

  const { title, rawText } = await (async () => {
    if (newRawText)
      return {
        title: '',
        rawText: newRawText
      };
    // link
    if (col.type === DatasetCollectionTypeEnum.link && col.rawLink) {
      // crawl new data
      const result = await urlsFetch({
        urlList: [col.rawLink],
        selector: col.datasetId?.websiteConfig?.selector || col?.metadata?.webPageSelector
      });

      return {
        title: result[0]?.title,
        rawText: result[0]?.content
      };
    }

    // file

    return {
      title: '',
      rawText: ''
    };
  })();

  const hashRawText = hashStr(rawText);
  const isSameRawText = rawText && col.hashRawText === hashRawText;

  return {
    collection: col,
    title,
    rawText,
    isSameRawText
  };
};

/* link collection start load data */
export const reloadCollectionChunks = async ({
  collection,
  tmbId,
  billId,
  rawText,
  session
}: {
  collection: CollectionWithDatasetType;
  tmbId: string;
  billId?: string;
  rawText?: string;
  session: ClientSession;
}): Promise<PushDatasetDataResponse> => {
  const {
    title,
    rawText: newRawText,
    collection: col,
    isSameRawText
  } = await getCollectionAndRawText({
    collection,
    newRawText: rawText
  });

  if (isSameRawText)
    return {
      insertLen: 0
    };

  // split data
  const { chunks } = splitText2Chunks({
    text: newRawText,
    chunkLen: col.chunkSize || 512
  });

  // insert to training queue
  const model = await (() => {
    if (col.trainingType === TrainingModeEnum.chunk) return col.datasetId.vectorModel;
    if (col.trainingType === TrainingModeEnum.qa) return col.datasetId.agentModel;
    return Promise.reject('Training model error');
  })();

  const result = await MongoDatasetTraining.insertMany(
    chunks.map((item, i) => ({
      teamId: col.teamId,
      tmbId,
      datasetId: col.datasetId._id,
      collectionId: col._id,
      billId,
      mode: col.trainingType,
      prompt: '',
      model,
      q: item,
      a: '',
      chunkIndex: i
    })),
    { session }
  );

  // update raw text
  await MongoDatasetCollection.findByIdAndUpdate(
    col._id,
    {
      ...(title && { name: title }),
      rawTextLength: newRawText.length,
      hashRawText: hashStr(newRawText)
    },
    { session }
  );

  return {
    insertLen: result.length
  };
};

export const createOrGetCollectionTags = async ({
  tags = [],
  datasetId,
  teamId,
  session
}: {
  tags?: string[];
  datasetId: string;
  teamId: string;
  session?: ClientSession;
}): Promise<string[]> => {
  if (!tags.length) return [];
  const existingTags = await MongoDatasetCollectionTags.find({
    teamId,
    datasetId,
    $expr: { $in: ['$tag', tags] }
  });

  const existingTagContents = existingTags.map((tag) => tag.tag);
  const newTagContents = tags.filter((tag) => !existingTagContents.includes(tag));

  const newTags = await MongoDatasetCollectionTags.insertMany(
    newTagContents.map((tagContent) => ({
      teamId,
      datasetId,
      tag: tagContent
    })),
    { session }
  );

  return [...existingTags.map((tag) => tag._id), ...newTags.map((tag) => tag._id)];
};
