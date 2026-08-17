import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { InternalServerErrorException, UsePipes, ValidationPipe } from '@nestjs/common';
import { LoginInput, MemberInput } from '../../libs/dto/member/member.input';
import { Member } from '../../libs/dto/member/member';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) { }

  @Mutation(() => Member) // POST
  @UsePipes(ValidationPipe)
  public async signup(@Args('input') input: MemberInput): Promise<Member> {
    try {
      console.log("Mutation: signup");
      console.log(input);
      return this.memberService.signup(input);
    } catch (err) {
      console.log("Error, signup", err);
      throw new InternalServerErrorException(err);
    }
  }

  @Mutation(() => String) // POST
  @UsePipes(ValidationPipe)
  public async login(@Args('input') input: LoginInput): Promise<string> {
    console.log("Mutation: login");
    return this.memberService.login();
  }

  @Mutation(() => String) // POST
  public async updateMember(): Promise<string> {
    console.log("Mutation: updateMember");
    return this.memberService.updateMember();
  }

  @Query(() => String) // GET
  public async getMember(): Promise<string> {
    console.log("Query: getMember");
    return this.memberService.getMember();
  }
}
