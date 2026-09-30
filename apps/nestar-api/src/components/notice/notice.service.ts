import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { NoticeStatus } from '../../libs/enums/notice.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';

@Injectable()
export class NoticeService {
  constructor(@InjectModel('Notice') private readonly noticeModel: Model<Notice>) { }

  public async getNotice(noticeId: ObjectId): Promise<Notice> {
    const search: T = { _id: noticeId, noticeStatus: NoticeStatus.ACTIVE };

    //@ts-ignore
    const result: Notice = await this.noticeModel.findOne(search).lean().exec();
    if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result;
  }

  public async getNotices(input: NoticesInquiry): Promise<Notices> {
    const { noticeCategory, text } = input.search;
    const match: T = { noticeStatus: NoticeStatus.ACTIVE };

    if (noticeCategory) match.noticeCategory = noticeCategory;
    if (text) match.noticeTitle = { $regex: new RegExp(text, 'i') };

    return await this.findNotices(match, input);
  }

  //ADMIN
  public async createNotice(memberId: ObjectId, input: NoticeInput): Promise<Notice> {
    input.memberId = memberId;

    try {
      return await this.noticeModel.create(input);
    } catch (err) {
      console.log('Error, Service.model:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  public async getNoticeByAdmin(noticeId: ObjectId): Promise<Notice> {
    //@ts-ignore
    const result: Notice = await this.noticeModel.findById(noticeId).lean().exec();
    if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result;
  }

  public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
    const { noticeStatus, noticeCategory, text } = input.search;
    const match: T = {};

    if (noticeStatus) match.noticeStatus = noticeStatus;
    if (noticeCategory) match.noticeCategory = noticeCategory;
    if (text) match.noticeTitle = { $regex: new RegExp(text, 'i') };

    return await this.findNotices(match, input);
  }

  public async updateNoticeByAdmin(input: NoticeUpdate): Promise<Notice> {
    //@ts-ignore
    const result: Notice = await this.noticeModel.findByIdAndUpdate(input._id, input, { new: true }).exec();
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    return result;
  }

  public async removeNoticeByAdmin(noticeId: ObjectId): Promise<Notice> {
    const search: T = { _id: noticeId, noticeStatus: NoticeStatus.DELETE };
    //@ts-ignore
    const result: Notice = await this.noticeModel.findOneAndDelete(search).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    return result;
  }

  private async findNotices(match: T, input: NoticesInquiry | AllNoticesInquiry): Promise<Notices> {
    const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    const result = await this.noticeModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              lookupMember,
              { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result[0];
  }
}
