import { Module } from '@nestjs/common';
import { BoardArticleResolver } from './board-article.resolver';
import { BoardArticleService } from './board-article.service';
import { MongooseModule } from '@nestjs/mongoose';
import BoardArticleSchema from '../../schemas/BoardArticle.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "BoardArticle",
        schema: BoardArticleSchema
      }
    ]),// PropertySchema model, => property resolverga yordam keladi
    AuthModule,
    ViewModule,
    MemberModule,
    LikeModule,
  ],
  exports: [BoardArticleService],
  providers: [BoardArticleResolver, BoardArticleService]
})
export class BoardArticleModule { }
