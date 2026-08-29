import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PropertyService } from './property.service';
import { Property } from '../../libs/dto/property/property';
import { PropertyInput } from '../../libs/dto/property/property.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as mongoose from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class PropertyResolver {
  constructor(private readonly propertyService: PropertyService) { }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Property) // POST
  public async createProperty(
    @Args('input') input: PropertyInput,
    @AuthMember("_id") memberId: mongoose.ObjectId
  ): Promise<Property> {
    console.log("Mutation: createProperty");
    input.memberId = memberId;

    return this.propertyService.createProperty(input);
  }

  @UseGuards(WithoutGuard)
  @Query((returns) => Property) // POST
  public async getProperty(
    @Args('propertyId') input: string,
    @AuthMember("_id") memberId: mongoose.ObjectId
  ): Promise<Property> {
    console.log("Query: getProperty");
    const propertyId = shapeIntoMongoObjectId(input);

    return this.propertyService.getProperty(memberId, propertyId);
  }
}
