import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import * as mongoose from 'mongoose';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) { }

  @Mutation(() => Member) // POST
  public async signup(@Args('input') input: MemberInput): Promise<Member> {
    console.log("Mutation: signup");
    return this.memberService.signup(input);
  }

  @Mutation(() => Member) // POST
  public async login(@Args('input') input: LoginInput): Promise<Member> {
    console.log("Mutation: login");
    return this.memberService.login(input);
  }


  // Authentificated users
  @UseGuards(AuthGuard)
  @Mutation(() => String) // POST
  public async updateMember(@AuthMember("_id") memberId: mongoose.ObjectId): Promise<string> {
    console.log("Mutation: updateMember");
    console.log(typeof memberId)
    return this.memberService.updateMember();
  }

  @UseGuards(AuthGuard)
  @Query(() => String) // POST
  public async checkAuth(@AuthMember("memberNick") memberNick: string): Promise<string> {
    console.log("Query: checkAuth");
    console.log("memberNick:", memberNick)
    return `Hi ${memberNick}`
  }

  @Query(() => String) // GET
  public async getMember(): Promise<string> {
    console.log("Query: getMember");
    return this.memberService.getMember();
  }

  /** ADMIN **/
  // Authorization: ADMIN
  @Mutation(() => String)
  public async getAllMembersByAdmin(): Promise<string> {
    console.log("Mutation: updateAllByAdmin");
    return this.memberService.getMember();
  }

  /** ADMIN **/
  // Authorization: ADMIN
  @Mutation(() => String)
  public async updateMembersByAdmin(): Promise<string> {
    console.log("Mutation: updateMembersByAdmin");
    return this.memberService.getMember();
  }
}
