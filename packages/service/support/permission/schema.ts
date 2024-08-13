import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { connectionMongo, getMongoModel } from '../../common/mongo';
import type { ResourcePermissionType } from '@fastgpt/global/support/permission/type';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
const { Schema } = connectionMongo;

export const ResourcePermissionCollectionName = 'resource_permission';

export const ResourcePermissionSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName
  },
  resourceType: {
    type: String,
    enum: Object.values(PerResourceTypeEnum),
    required: true
  },
  permission: {
    type: Number,
    required: true
  },
  // Resrouce ID: App or DataSet or any other resource type.
  // It is null if the resourceType is team.
  resourceId: {
    type: Schema.Types.ObjectId
  }
});

try {
  ResourcePermissionSchema.index(
    {
      resourceType: 1,
      teamId: 1,
      tmbId: 1,
      resourceId: 1
    },
    {
      unique: true
    }
  );
  ResourcePermissionSchema.index({
    resourceType: 1,
    teamId: 1,
    resourceId: 1
  });
} catch (error) {
  console.log(error);
}

export const MongoResourcePermission = getMongoModel<ResourcePermissionType>(
  ResourcePermissionCollectionName,
  ResourcePermissionSchema
);
