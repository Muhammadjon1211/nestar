import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import * as mongoose from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update'
import { getSerialForImage, isValidImage, shapeIntoMongoObjectId } from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream } from 'fs';
import { Message } from '../../libs/enums/common.enum';

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

  @UseGuards(AuthGuard)
  @Query(() => String) // POST
  public async checkAuth(@AuthMember("memberNick") memberNick: string): Promise<string> {
    console.log("Query: checkAuth");
    console.log("memberNick:", memberNick)
    return `Hi ${memberNick}`
  }

  @Roles(MemberType.USER, MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Query(() => String) // POST
  public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
    console.log("Query: checkAuthRoles");
    return `Hi ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`
  }

  // Authentificated users
  @UseGuards(AuthGuard)
  @Mutation(() => Member) // POST
  public async updateMember(
    @Args("input") input: MemberUpdate,
    //@ts-ignore
    @AuthMember("_id") memberId: ObjectId
  ): Promise<Member> {
    console.log("Mutation: updateMember");
    //@ts-ignore
    delete input._id;
    //@ts-ignore
    return await this.memberService.updateMember(memberId, input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Member) // GET
  public async getMember(@Args("memberId") input: string, @AuthMember("_id") memberId: mongoose.ObjectId): Promise<Member> {
    console.log("Query: getMember");
    const targetId = shapeIntoMongoObjectId(input);
    //@ts-ignore
    return await this.memberService.getMember(memberId, targetId);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Members)
  public async getAgents(@Args("input") input: AgentsInquiry, @AuthMember("_id") memberId: mongoose.ObjectId): Promise<Members> {
    console.log("Query: getAgents")
    return await this.memberService.getAgents(memberId, input);
  }

  /** ADMIN **/
  // Authorization: ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Members)
  public async getAllMembersByAdmin(@Args("input") input: MembersInquiry): Promise<Members> {
    console.log("Query: getAllMembersByAdmin");
    return await this.memberService.getAllMembersByAdmin(input);
  }

  /** ADMIN **/
  // Authorization: ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Member)
  public async updateMembersByAdmin(@Args("input") input: MemberUpdate): Promise<Member> {
    console.log("Mutation: updateMembersByAdmin");
    return await this.memberService.updateMembersByAdmin(input);
  }

  /** UPLOADER **/
  @UseGuards(AuthGuard)
  @Mutation((returns) => String)
  public async imageUploader(
    @Args({ name: 'file', type: () => GraphQLUpload })
    file: Promise<FileUpload> | FileUpload,
    @Args('target') target: String,
  ): Promise<string> {
    console.log('Mutation: imageUploader');

    const { createReadStream, filename, mimetype } = await file;
    console.log('upload:', { filename, mimetype });

    if (!filename) throw new Error(Message.UPLOAD_FAILED);
    if (!isValidImage(filename, mimetype)) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

    const imageName = getSerialForImage(filename);
    const url = `uploads/${target}/${imageName}`;
    const stream = createReadStream();

    const result = await new Promise((resolve, reject) => {
      stream
        .pipe(createWriteStream(url))
        .on('finish', async () => resolve(true))
        .on('error', () => reject(false));
    });
    if (!result) throw new Error(Message.UPLOAD_FAILED);
    console.log({ filename, mimetype })
    return url;
  }

  @UseGuards(AuthGuard)
  @Mutation((returns) => [String])
  public async imagesUploader(
    @Args('files', { type: () => [GraphQLUpload] })
    files: Promise<FileUpload>[],
    @Args('target') target: String,
  ): Promise<string[]> {
    console.log('Mutation: imagesUploader');

    const uploadedImages = [];
    const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
      try {
        const { filename, mimetype, encoding, createReadStream } = await img;
        console.log('upload:', { filename, mimetype });

        if (!filename) throw new Error(Message.UPLOAD_FAILED);
        if (!isValidImage(filename, mimetype)) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

        const imageName = getSerialForImage(filename);
        const url = `uploads/${target}/${imageName}`;
        const stream = createReadStream();

        const result = await new Promise((resolve, reject) => {
          stream
            .pipe(createWriteStream(url))
            .on('finish', () => resolve(true))
            .on('error', () => reject(false));
        });
        if (!result) throw new Error(Message.UPLOAD_FAILED);
        //@ts-ignore
        uploadedImages[index] = url;
      } catch (err) {
        console.log('Error, file missing!', err);
      }
    });

    await Promise.all(promisedList);
    return uploadedImages;
  }
}
