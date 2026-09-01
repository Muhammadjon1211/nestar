import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BoardArticle } from '../../libs/dto/board-article/board-article';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';

@Injectable()
export class BoardArticleService {
  constructor(@InjectModel("BoardArticle") private readonly boardArticleModel: Model<BoardArticle>,
    private authService: AuthService,
    private viewService: ViewService) { }

}
