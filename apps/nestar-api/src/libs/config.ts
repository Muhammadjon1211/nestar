import { ObjectId } from "bson";
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const availableAgentSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews", "memberRank"];
export const availableMemberSorts = ["createdAt", "updatedAt", "memberLikes", "memberViews"];

export const availableOptions = ["propertyBarter", "propertyRent"];
export const availablePropertySorts = [
  "createdAt",
  "updatedAt",
  "propertyLikes",
  "propertyViews",
  "propertyRank",
  "propertyPrice",
];

export const availableBoardArticlesSorts = ["createdAt", "updatedAt", "articleLikes", "articleViews"];

export const availableCommentSorts = ["createdAt", "updatedAt"]

// IMAGE CONFIGURATION
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const validImageExtensions = ['.png', '.jpg', '.jpeg'];

export const isValidImage = (filename: string, mimetype?: string): boolean => {
  // Some clients (Postman, Altair, curl) send "application/octet-stream" or an empty
  // content-type for the file part, so fall back to the file extension.
  const mime = (mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (validMimeTypes.includes(mime)) return true;

  const ext = path.parse(filename ?? '').ext.toLowerCase();
  return validImageExtensions.includes(ext);
};

export const getSerialForImage = (filename: string) => {
  const ext = path.parse(filename).ext;
  return uuidv4() + ext;
};

export const shapeIntoMongoObjectId = (target: any) => {
  return typeof target === "string" ? new ObjectId(target) : target;
}

export const lookupMember = {
  $lookup: {
    from: "members",
    localField: "memberId",
    foreignField: "_id",
    as: "memberData",
  },
}

export const lookupFollowingData = {
  $lookup: {
    from: 'members',
    localField: 'followingId',
    foreignField: '_id',
    as: 'followingData',
  },
};

export const lookupFollowerData = {
  $lookup: {
    from: 'members',
    localField: 'followerId',
    foreignField: '_id',
    as: 'followerData',
  },
};
