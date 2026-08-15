import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) { }

  @Mutation(() => String) // POST
  public async signup(): Promise<string> {
    console.log("Mutation: signup");
    return this.memberService.signup();
  }

  @Mutation(() => String) // POST
  public async login(): Promise<string> {
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
