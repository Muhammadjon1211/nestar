import { Module } from '@nestjs/common';
import { PropertyResolver } from './property.resolver';
import { PropertyService } from './property.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import PropertySchema from '../../schemas/Property.model';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Property", schema: PropertySchema }]),// PropertySchema model, => property resolverga yordam keladi
    AuthModule,
    ViewModule,
    MemberModule,
  ],
  exports: [PropertyService],
  providers: [PropertyResolver, PropertyService]
})
export class PropertyModule { }
