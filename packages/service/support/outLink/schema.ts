import { connectionMongo, getMongoModel, type Model } from '../../common/mongo';
const { Schema, model, models } = connectionMongo;
import { OutLinkSchema as SchemaType } from '@fastgpt/global/support/outLink/type';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { AppCollectionName } from '../../core/app/schema';

const OutLinkSchema = new Schema({
  shareId: {
    type: String,
    required: true
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  appId: {
    type: Schema.Types.ObjectId,
    ref: AppCollectionName,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  usagePoints: {
    type: Number,
    default: 0
  },
  lastTime: {
    type: Date
  },
  responseDetail: {
    type: Boolean,
    default: false
  },
  limit: {
    maxUsagePoints: {
      type: Number,
      default: -1
    },
    expiredTime: {
      type: Date
    },
    QPM: {
      type: Number,
      default: 1000
    },
    hookUrl: {
      type: String
    }
  },
  app: {
    appId: {
      type: String
    },
    appSecret: {
      type: String
    },
    encryptKey: {
      type: String
    },
    verificationToken: {
      type: String
    }
  },
  immediateResponse: {
    type: String
  },
  defaultResponse: {
    type: String
  }
});

try {
  OutLinkSchema.index({ shareId: -1 });
} catch (error) {
  console.log(error);
}

export const MongoOutLink = getMongoModel<SchemaType>('outlinks', OutLinkSchema);
