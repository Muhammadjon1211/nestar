import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowResolver } from './follow.resolver';
import FollowSchema from '../../schemas/Follow.model';
import { AuthModule } from '../auth/auth.module';
import { LikeModule } from '../like/like.module';
import { FollowService } from './follow.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Follow", schema: FollowSchema }]),
    AuthModule,
    LikeModule,
  ],
  exports: [FollowModule],
  providers: [FollowResolver, FollowService]
})
export class FollowModule { }
