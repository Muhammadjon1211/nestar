import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { NoticeService } from './notice.service';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class NoticeResolver {
  constructor(private readonly noticeService: NoticeService) { }

  @UseGuards(WithoutGuard)
  @Query(() => Notice)
  public async getNotice(@Args('noticeId') input: string): Promise<Notice> {
    console.log('Query: getNotice');
    const noticeId = shapeIntoMongoObjectId(input);
    return await this.noticeService.getNotice(noticeId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Notices)
  public async getNotices(@Args('input') input: NoticesInquiry): Promise<Notices> {
    console.log('Query: getNotices');
    return await this.noticeService.getNotices(input);
  }

  //ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async createNotice(
    @Args('input') input: NoticeInput,
    //@ts-ignore
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Notice> {
    console.log('Mutation: createNotice');
    return await this.noticeService.createNotice(memberId, input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Notice)
  public async getNoticeByAdmin(@Args('noticeId') input: string): Promise<Notice> {
    console.log('Query: getNoticeByAdmin');
    const noticeId = shapeIntoMongoObjectId(input);
    return await this.noticeService.getNoticeByAdmin(noticeId);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Notices)
  public async getAllNoticesByAdmin(@Args('input') input: AllNoticesInquiry): Promise<Notices> {
    console.log('Query: getAllNoticesByAdmin');
    return await this.noticeService.getAllNoticesByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async updateNoticeByAdmin(@Args('input') input: NoticeUpdate): Promise<Notice> {
    console.log('Mutation: updateNoticeByAdmin');
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.noticeService.updateNoticeByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Notice)
  public async removeNoticeByAdmin(@Args('noticeId') input: string): Promise<Notice> {
    console.log('Mutation: removeNoticeByAdmin');
    const noticeId = shapeIntoMongoObjectId(input);
    return await this.noticeService.removeNoticeByAdmin(noticeId);
  }
}
