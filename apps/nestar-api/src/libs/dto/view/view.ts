import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ObjectId } from "mongoose";
import { ViewGroup } from "../../enums/view.enum";


@ObjectType()
export class View {
  @Field(() => String)
  //@ts-ignore
  _id: ObjectId;

  @Field(() => ViewGroup)
  viewGroup: ViewGroup;

  @Field(() => String)
  //@ts-ignore
  viewRefid: ObjectId;

  @Field(() => String)
  //@ts-ignore
  memberId: ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}