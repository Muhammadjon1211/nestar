import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { MongooseModule } from '@nestjs/mongoose';
import LikeSchema from '../../schemas/Like.model';
import { MemberService } from '../member/member.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "Like",
        schema: LikeSchema,
      },
    ]),
  ],
  providers: [LikeService],
  exports: [LikeService]
})
export class LikeModule { }
