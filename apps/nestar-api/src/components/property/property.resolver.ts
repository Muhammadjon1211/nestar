import { Mutation, Resolver } from '@nestjs/graphql';
import { PropertyService } from './property.service';

@Resolver()
export class PropertyResolver {
  constructor(private readonly propertyService: PropertyService) { }

  @Mutation(() => Member) // POST
  public async signup(@Args('input') input: MemberInput): Promise<Member> {
    console.log("Mutation: signup");
    return this.propertyService.signup(input);
  }
}
