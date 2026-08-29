# NestJS + GraphQL Project Standards

> **Purpose of this file.** It is the complete engineering specification extracted from a working
> NestJS + GraphQL + MongoDB monorepo (a real-estate marketplace called *nestar*). It describes the
> folder layout, file naming, layer responsibilities, decorator usage, DTO/schema conventions, auth
> model and build order used there.
>
> **How to use it.** You are building a *different* project with a *different* domain. Do **not** copy
> the real-estate entities. Copy the **structure, naming grammar, layering and patterns**, and
> substitute your own domain nouns using the mapping table in §2. Every code block below is a
> template — the placeholders in `PascalCase` / `camelCase` are meant to be renamed.

---

## 1. Stack & Baseline

| Concern | Choice |
|---|---|
| Framework | NestJS 10 (**monorepo mode**, `nest-cli.json` with `"monorepo": true`) |
| API style | **GraphQL code-first** (`autoSchemaFile: true`, no `.graphql` files written by hand) |
| GraphQL driver | Apollo (`@nestjs/apollo` + `@apollo/server`) |
| Database | MongoDB via **plain Mongoose schemas** (`new Schema({...})`, *not* `@nestjs/mongoose` decorators) |
| Auth | JWT (`@nestjs/jwt`) + bcryptjs, custom Guards, no Passport |
| Validation | `class-validator` decorators on `@InputType()` DTOs + global `ValidationPipe` |
| File upload | `graphql-upload` v13 + `graphqlUploadExpress` middleware, files written to disk under `./uploads` |
| Config | `@nestjs/config` global, `.env` at repo root |
| Scheduled jobs | `@nestjs/schedule` in a separate `batch` app |
| Realtime (planned) | `@nestjs/websockets` + `@nestjs/platform-ws` |
| Language | TypeScript 5, `target: ES2023`, decorators on, `noImplicitAny: false`, `strictNullChecks: true` |

### package.json scripts (keep these names)

```json
{
  "build": "nest build",
  "format": "prettier --write \"apps/**/*.ts\" \"libs/**/*.ts\"",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:dev:batch": "nest start <project>-batch --watch",
  "start:prod": "NODE_ENV=production node dist/apps/<project>-api/main",
  "start:prod:batch": "node dist/apps/<project>-batch/main",
  "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
  "test": "jest",
  "test:e2e": "jest --config ./apps/<project>-api/test/jest-e2e.json"
}
```

### .env (root, gitignored)

```
PORT_API=3007
PORT_BATCH=3008
MONGO_DEV=mongodb+srv://.../<project>-dev
MONGO_PROD=mongodb+srv://.../<project>-prod
SECRET_TOKEN=<random-long-string>
```

`.gitignore` must contain `/dist`, `/node_modules`, `.env`, and `uploads`.

---

## 2. Domain Mapping — read this before writing any code

The reference project has **three tiers** of entity. Map your own domain onto the same tiers; the
whole architecture follows from that.

| Tier | Reference entity | Role | Your project substitutes |
|---|---|---|---|
| **A. Actor** | `Member` | The account: signup/login/JWT, roles, denormalized counters, profile image | e.g. `User`, `Customer`, `Doctor`, `Student` |
| **B. Primary resource** | `Property` | The main thing actors create/browse/search — owned by an actor, listed, filtered, paginated | e.g. `Course`, `Product`, `Appointment`, `Job` |
| **B2. Secondary resource** | `BoardArticle` | Community/content entity, same shape as B but lighter | e.g. `Post`, `Review`, `Announcement` |
| **C. Engagement / join** | `View`, `Like`, `Follow`, `Comment`, `Notice`, `Notification` | Small polymorphic join collections that reference A and B via `<x>RefId` + `<x>Group` enum | usually keep them **as-is**, only rename the group enum members |

**Naming grammar — the single most important rule of this codebase:**

> **Every field of an entity is prefixed with the entity name in camelCase.**

`memberNick`, `memberStatus`, `memberViews`, `propertyTitle`, `propertyPrice`, `propertyImages`,
`articleTitle`, `commentContent`, `viewGroup`, `likeRefId`.
The only unprefixed fields are `_id`, `createdAt`, `updatedAt`, `deletedAt`, and foreign keys
(`memberId`, `authorId`, `receiverId`).

Apply the same grammar with your own nouns: `courseTitle`, `coursePrice`, `courseStatus`,
`userNick`, `userStatus`, `userCourses`.

---

## 3. Folder Structure

```
<project>/                                   # repo root
├── .env                                     # gitignored
├── .prettierrc
├── .gitignore
├── .vscode/settings.json
├── eslint.config.mjs
├── nest-cli.json                            # monorepo: true
├── package.json
├── tsconfig.json                            # base
├── tsconfig.build.json
├── uploads/                                 # runtime image storage, gitignored
│   ├── <actor>/
│   └── <resource>/
└── apps/
    ├── <project>-api/                       # the GraphQL server  <- 95% of the work
    │   ├── tsconfig.app.json
    │   ├── test/
    │   │   ├── app.e2e-spec.ts
    │   │   └── jest-e2e.json
    │   └── src/
    │       ├── main.ts                      # bootstrap
    │       ├── app.module.ts                # root module: Config + GraphQL + Components + Database
    │       ├── app.controller.ts            # trivial REST health endpoint
    │       ├── app.service.ts               # returns a welcome string
    │       ├── app.resolver.ts              # trivial `sayHello` query
    │       │
    │       ├── components/                  # FEATURE MODULES — one folder per domain concept
    │       │   ├── components.module.ts     # aggregator, imports every feature module
    │       │   ├── auth/
    │       │   │   ├── auth.module.ts
    │       │   │   ├── auth.service.ts
    │       │   │   ├── decorators/
    │       │   │   │   ├── authMember.decorator.ts
    │       │   │   │   └── roles.decorator.ts
    │       │   │   └── guards/
    │       │   │       ├── auth.guard.ts
    │       │   │       ├── roles.guard.ts
    │       │   │       └── without.guard.ts
    │       │   ├── <actor>/                 # member/
    │       │   │   ├── <actor>.module.ts
    │       │   │   ├── <actor>.resolver.ts
    │       │   │   └── <actor>.service.ts
    │       │   ├── <resource>/              # property/
    │       │   ├── <secondary>/             # board-article/   (kebab-case folder)
    │       │   ├── comment/
    │       │   ├── like/
    │       │   ├── follow/
    │       │   ├── view/
    │       │   └── notice/
    │       │
    │       ├── database/
    │       │   └── database.module.ts       # MongooseModule.forRootAsync + connection log
    │       │
    │       ├── libs/                        # SHARED, framework-agnostic building blocks
    │       │   ├── config.ts                # sort whitelists, image helpers, ObjectId helper
    │       │   ├── dto/                     # GraphQL types — one folder per entity
    │       │   │   ├── <actor>/
    │       │   │   │   ├── <actor>.ts        # @ObjectType() — output
    │       │   │   │   ├── <actor>.input.ts  # @InputType() — create + inquiry inputs
    │       │   │   │   └── <actor>.update.ts # @InputType() — update input
    │       │   │   ├── <resource>/
    │       │   │   └── view/ like/ comment/ follow/ ...
    │       │   ├── enums/                   # one file per entity, kebab-case
    │       │   │   ├── common.enum.ts       # Message + Direction
    │       │   │   ├── <actor>.enum.ts
    │       │   │   ├── <resource>.enum.ts
    │       │   │   └── view.enum.ts like.enum.ts comment.enum.ts ...
    │       │   ├── types/
    │       │   │   └── common.ts            # T, StatisticModifier
    │       │   └── interceptor/
    │       │       └── Logging.interceptor.ts
    │       │
    │       └── schemas/                     # Mongoose schemas — PascalCase + .model.ts
    │           ├── <Actor>.model.ts
    │           ├── <Resource>.model.ts
    │           ├── View.model.ts
    │           ├── Like.model.ts
    │           ├── Follow.model.ts
    │           ├── Comment.model.ts
    │           ├── Notice.model.ts
    │           └── Notification.model.ts
    │
    └── <project>-batch/                     # cron / aggregation worker
        ├── tsconfig.app.json
        ├── test/
        └── src/
            ├── main.ts
            ├── <project>-batch.module.ts
            ├── <project>-batch.controller.ts
            └── <project>-batch.service.ts
```

### File naming rules

| Kind | Convention | Example |
|---|---|---|
| Module / resolver / service | `<feature>.module.ts`, `<feature>.resolver.ts`, `<feature>.service.ts` — folder is kebab-case | `board-article/board-article.service.ts` |
| GraphQL output type | `libs/dto/<entity>/<entity>.ts` | `libs/dto/property/property.ts` |
| GraphQL create/inquiry inputs | `libs/dto/<entity>/<entity>.input.ts` | `property.input.ts` |
| GraphQL update input | `libs/dto/<entity>/<entity>.update.ts` | `member.update.ts` |
| Enums | `libs/enums/<entity>.enum.ts` (kebab-case) | `board-article.enum.ts` |
| Mongoose schema | `schemas/<Entity>.model.ts` (**PascalCase file name**) | `schemas/Property.model.ts` |
| Guards | `guards/<name>.guard.ts` | `auth.guard.ts` |
| Decorators | `decorators/<camelCaseName>.decorator.ts` | `authMember.decorator.ts` |
| Interceptors | `interceptor/<PascalCase>.interceptor.ts` | `Logging.interceptor.ts` |

---

## 4. Bootstrap Layer

### `src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({ origin: true, credentials: true });

  app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
  app.use('/uploads', express.static('./uploads'));
  await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();
```

Order matters: pipes → interceptors → cors → upload middleware → static.

### `src/app.module.ts`

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      //@ts-ignore
      uploads: false,                 // REQUIRED: disable Apollo's built-in uploads,
                                      // graphql-upload middleware handles them instead
      autoSchemaFile: true,           // code-first, schema generated in memory
      formatError: (error: T) => {
        const graphQLFormattedError = {
          code: error?.extensions.code,
          message:
            error?.extensions?.exception?.response?.message ||
            error?.extensions?.response?.message ||
            error?.message,
        };
        console.log('GRAPHQL GLOBAL ERROR:', graphQLFormattedError);
        return graphQLFormattedError;
      },
    }),
    ComponentsModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
```

### `src/database/database.module.ts`

Async factory, env-driven DB selection, connection-state log in the constructor.

```ts
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {
  constructor(@InjectConnection() private readonly connection: Connection) {
    if (connection.readyState === 1) {
      console.log(`MongoDB is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} DB`);
    } else {
      console.log('DB is not connected!');
    }
  }
}
```

### `src/components/components.module.ts`

Pure aggregator — no providers, no controllers. Every feature module is listed here, and
`ComponentsModule` is the only components-related import in `AppModule`.

```ts
@Module({
  imports: [ActorModule, AuthModule, ResourceModule, CommentModule, LikeModule, ViewModule, FollowModule],
})
export class ComponentsModule {}
```

---

## 5. Shared Libs

### `libs/types/common.ts` — always create this first

```ts
import { ObjectId } from 'mongoose';

/** Loose map used for dynamic Mongo `match` / `sort` objects and JWT payloads. */
export interface T {
  [key: string]: any;
}

/** Used by every `<entity>StatsEditor` to $inc a denormalized counter. */
export interface StatisticModifier {
  _id: ObjectId;
  targetKey: string;
  modifier: number;
}
```

### `libs/enums/common.enum.ts`

Two things live here and nothing else: the **Message** catalogue (every user-facing error string in
the app — services never inline a string literal) and **Direction**.

```ts
export enum Message {
  SOMETHING_WENT_WRONG = 'Something went wrong!',
  NOT_DATA_FOUND = 'No data found!',
  CREATE_FAILED = 'Create failed!',
  UPDATE_FAILED = 'Update failed!',
  REMOVE_FAILED = 'Remove failed!',
  UPLOAD_FAILED = 'Upload failed!',
  BAD_REQUEST = 'Bad Request',

  USED_MEMBER_NICK_OR_PHONE = 'Already used nick or phone',
  NO_MEMBER_NICK = 'No member with that nickname!',
  WRONG_PASSWORD = 'Wrong password, try again!',
  NOT_AUTHENTICATED = 'You are not authenticated, Please login first!',
  BLOCKED_USER = 'You have been blocked!',
  TOKEN_NOT_EXIST = 'Bearer Token is not provided!',
  ONLY_SPECIFIC_ROLES_ALLOWED = 'Allowed only for members with specific roles!',
  NOT_ALLOWED_REQUEST = 'Not Allowed Request!',
  PROVIDE_ALLOWED_FORMAT = 'Please provide jpg, png, or jpeg images!',
  SELF_SUBSCRIPTION_DENIED = 'Self subscription is denied!',
}

export enum Direction {
  ASC = 1,
  DESC = -1,
}
registerEnumType(Direction, { name: 'Direction' });
```

> Rename the domain-specific members to your own vocabulary, keep the generic ones verbatim.

### Every other enum file

One file per entity. **Every enum must be registered with GraphQL immediately after declaration**,
with `name` equal to the enum identifier:

```ts
import { registerEnumType } from '@nestjs/graphql';

export enum ActorType { USER = 'USER', AGENT = 'AGENT', ADMIN = 'ADMIN' }
registerEnumType(ActorType, { name: 'ActorType' });

export enum ActorStatus { ACTIVE = 'ACTIVE', BLOCK = 'BLOCK', DELETE = 'DELETE' }
registerEnumType(ActorStatus, { name: 'ActorStatus' });
```

Standard enum sets to reproduce for your domain:

* `<Actor>Type` — role enum, must include `ADMIN`.
* `<Actor>Status` — `ACTIVE | BLOCK | DELETE`.
* `<Actor>AuthType` — `PHONE | EMAIL | TELEGRAM`.
* `<Resource>Status` — `HOLD | ACTIVE | <TERMINAL> | DELETE` (reference uses `SOLD`; use `COMPLETED`, `PUBLISHED`, `CLOSED`… as fits).
* `<Resource>Type`, `<Resource>Location` / any faceted-search dimension.
* `ViewGroup`, `LikeGroup`, `CommentGroup`, `NotificationGroup` — **all share the same member set**, one per viewable entity: `MEMBER | ARTICLE | PROPERTY` → your `ACTOR | POST | RESOURCE`.

### `libs/config.ts`

Three responsibilities, nothing else:

```ts
import { ObjectId } from 'bson';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

// 1. SORT WHITELISTS — referenced by @IsIn() in every Inquiry DTO
export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];
// add: availablePropertySorts, availableBoardArticleSorts, availableCommentSorts ...

// 2. IMAGE CONFIGURATION
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const validImageExtensions = ['.png', '.jpg', '.jpeg'];

export const isValidImage = (filename: string, mimetype?: string): boolean => {
  // Some clients (Postman, Altair, curl) send "application/octet-stream" or an empty
  // content-type for the file part, so fall back to the file extension.
  const mime = (mimetype ?? '').split(';')[0].trim().toLowerCase();
  if (validMimeTypes.includes(mime)) return true;
  const ext = path.parse(filename ?? '').ext.toLowerCase();
  return validImageExtensions.includes(ext);
};

export const getSerialForImage = (filename: string) => {
  const ext = path.parse(filename).ext;
  return uuidv4() + ext;
};

// 3. MONGO HELPER — string id from GraphQL -> real ObjectId
export const shapeIntoMongoObjectId = (target: any) => {
  return typeof target === 'string' ? new ObjectId(target) : target;
};
```

### `libs/interceptor/Logging.interceptor.ts`

Global interceptor, registered in `main.ts`. Logs request body then the response with elapsed ms,
truncating both to 75 chars.

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: Logger = new Logger();

  public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const recordTime = Date.now();
    const requestType = context.getType<GqlContextType>();

    if (requestType === 'http') {
      // Develop if needed!
    } else if (requestType === 'graphql') {
      // (1) PRINT REQUEST
      const gqlContext = GqlExecutionContext.create(context);
      this.logger.log(`${this.stringify(gqlContext.getContext().req.body)}`, 'REQUEST');

      // (2) Errors handled globally by GraphQL formatError
      // (3) No errors -> response
      return next.handle().pipe(
        tap((context) => {
          const responseTime = Date.now() - recordTime;
          this.logger.log(`${this.stringify(context)}-${responseTime}ms \n\n`, 'RESPONSE');
        }),
      );
    }
    return next.handle();
  }

  private stringify(context: ExecutionContext): string {
    return JSON.stringify(context).slice(0, 75);
  }
}
```

---

## 6. Mongoose Schema Layer (`src/schemas/`)

**Rules**

1. Plain `new Schema({...})`, **no** `@Schema()`/`@Prop()` decorators.
2. `export default <Entity>Schema;` — default export, imported without braces.
3. Always `{ timestamps: true, collection: '<pluralCamelCase>' }`.
4. Status/type fields: `{ type: String, enum: SomeEnum, default: SomeEnum.ACTIVE }` or `required: true`.
5. Every counter field: `{ type: Number, default: 0 }` — counters are **denormalized on the parent document** and maintained by `<entity>StatsEditor` in the service.
6. Foreign keys: `{ type: Schema.Types.ObjectId, required: true, ref: '<Entity>' }`.
7. Secrets: `memberPassword: { type: String, select: false, required: true }` — never returned unless `.select('+memberPassword')`.
8. Uniqueness: inline `index: { unique: true, sparse: true }` for single fields; a compound
   `Schema.index({...}, { unique: true })` after the definition for join collections and for
   duplicate-listing prevention.
9. Soft delete: `deletedAt: { type: Date }` plus a `DELETE` member in the status enum. Records are
   never physically removed.

**Actor schema template**

```ts
const ActorSchema = new Schema({
  actorType:     { type: String, enum: ActorType, default: ActorType.USER },
  actorStatus:   { type: String, enum: ActorStatus, default: ActorStatus.ACTIVE },
  actorAuthType: { type: String, enum: ActorAuthType, default: ActorAuthType.PHONE },
  actorPhone:    { type: String, index: { unique: true, sparse: true }, required: true },
  actorNick:     { type: String, index: { unique: true, sparse: true }, required: true },
  actorPassword: { type: String, select: false, required: true },
  actorFullName: { type: String },
  actorImage:    { type: String, default: '' },
  actorAddress:  { type: String },
  actorDesc:     { type: String },

  // denormalized counters — one per relationship the UI needs to display
  actorResources:  { type: Number, default: 0 },
  actorArticles:   { type: Number, default: 0 },
  actorFollowers:  { type: Number, default: 0 },
  actorFollowings: { type: Number, default: 0 },
  actorPoints:     { type: Number, default: 0 },
  actorLikes:      { type: Number, default: 0 },
  actorViews:      { type: Number, default: 0 },
  actorComments:   { type: Number, default: 0 },
  actorRank:       { type: Number, default: 0 },
  actorWarnings:   { type: Number, default: 0 },
  actorBlocks:     { type: Number, default: 0 },

  deletedAt: { type: Date },
}, { timestamps: true, collection: 'actors' });

export default ActorSchema;
```

**Primary-resource schema template**

```ts
const ResourceSchema = new Schema({
  resourceType:     { type: String, enum: ResourceType, required: true },
  resourceStatus:   { type: String, enum: ResourceStatus, default: ResourceStatus.ACTIVE },
  resourceCategory: { type: String, enum: ResourceCategory, required: true },
  resourceTitle:    { type: String, required: true },
  resourcePrice:    { type: Number, required: true },
  resourceImages:   { type: [String], required: true },
  resourceDesc:     { type: String },

  resourceViews:    { type: Number, default: 0 },
  resourceLikes:    { type: Number, default: 0 },
  resourceComments: { type: Number, default: 0 },
  resourceRank:     { type: Number, default: 0 },

  actorId:   { type: Schema.Types.ObjectId, required: true, ref: 'Actor' },
  closedAt:  { type: Date },
  deletedAt: { type: Date },
}, { timestamps: true, collection: 'resources' });

ResourceSchema.index({ resourceType: 1, resourceCategory: 1, resourceTitle: 1, resourcePrice: 1 }, { unique: true });

export default ResourceSchema;
```

**Engagement schema template** (View / Like — identical shape, different collection)

```ts
const ViewSchema = new Schema({
  viewGroup: { type: String, enum: ViewGroup, required: true },
  viewRefId: { type: Schema.Types.ObjectId, required: true },
  actorId:   { type: Schema.Types.ObjectId, required: true, ref: 'Actor' },
}, { timestamps: true, collection: 'views' });

ViewSchema.index({ actorId: 1, viewRefId: 1 }, { unique: true });
export default ViewSchema;
```

`Follow` uses `{ followingId, followerId }` with a compound unique index.
`Notification` carries `authorId` + `receiverId` + optional `resourceId` / `articleId`.

---

## 7. DTO Layer (`src/libs/dto/`)

This is the GraphQL contract. **Three files per entity**, never more.

### 7.1 `<entity>.ts` — `@ObjectType()` outputs

* Mirrors the Mongoose schema field-for-field.
* `_id` is always `@Field(() => String) _id: ObjectId | undefined;`
* Enum fields use the enum as the GraphQL type: `@Field(() => ActorType)`.
* Counters use `@Field(() => Int)`; money/measures use `@Field(() => Number)`.
* Optional fields: `@Field(() => String, { nullable: true }) foo?: string;`
* Secrets get **no** `@Field` at all — declared as a bare TS property so the service can read them
  but GraphQL can never expose them (`actorPassword?: string;`).
* `accessToken?: string` lives on the actor output type, nullable, populated at signup/login.

```ts
@ObjectType()
export class Actor {
  @Field(() => String) _id: ObjectId | undefined;
  @Field(() => ActorType) actorType: ActorType | undefined;
  @Field(() => ActorStatus) actorStatus: ActorStatus | undefined;
  @Field(() => String) actorPhone: string | undefined;
  @Field(() => String) actorNick: string | undefined;

  actorPassword?: string;                                   // no @Field — never exposed

  @Field(() => String, { nullable: true }) actorFullName?: string;
  @Field(() => String) actorImage?: string;
  @Field(() => Int) actorResources: number;
  @Field(() => Int) actorLikes: number;
  @Field(() => Int) actorViews: number;
  @Field(() => Date, { nullable: true }) deletedAt?: Date;
  @Field(() => Date) createdAt: Date;
  @Field(() => Date) updatedAt: Date;
  @Field(() => String, { nullable: true }) accessToken?: string;
}
```

**The pagination pair — define once, repeat per entity.**

```ts
@ObjectType()
export class TotalCounter {
  @Field(() => Int, { nullable: true }) total: number;
}

@ObjectType()
export class Actors {                       // plural class name = the list wrapper
  @Field(() => [Actor]) list: Actor[];
  @Field(() => [TotalCounter], { nullable: true }) metaCounter: TotalCounter[];
}
```

> This `{ list, metaCounter }` shape is produced directly by the `$facet` aggregation in §8.3 —
> every list query in the app returns it.

### 7.2 `<entity>.input.ts` — creation + inquiry inputs

Contains, in this order:

1. `<Entity>Input` — the create payload.
2. `LoginInput` (actor only).
3. A **non-exported** nested search class per inquiry, named with the inquiry's initials + `Search`
   (`AISearch` for `AgentsInquiry`, `MISearch` for `MembersInquiry`, `PISearch` for
   `PropertiesInquiry`). This class is `@InputType()` but **not exported** — it exists only as the
   `search` field of its inquiry.
4. `<Plural>Inquiry` — the paginated list request.

**Validation is stacked above the `@Field`, in this order:** `@IsNotEmpty()` / `@IsOptional()`,
then type/shape validators (`@IsInt`, `@Length`, `@Min`, `@IsIn`), then `@Field(...)`.

```ts
@InputType()
export class ActorInput {
  @IsNotEmpty() @Length(3, 12)  @Field(() => String) actorNick: string;
  @IsNotEmpty() @Length(5, 12)  @Field(() => String) actorPassword: string;
  @IsNotEmpty()                 @Field(() => String) actorPhone: string;
  @IsOptional() @Field(() => ActorType, { nullable: true }) actorType?: ActorType;
  @IsOptional() @Field(() => ActorAuthType, { nullable: true }) actorAuthType?: ActorAuthType;
}

@InputType()
export class LoginInput {
  @IsNotEmpty() @Length(3, 12) @Field(() => String) actorNick: string;
  @IsNotEmpty() @Length(5, 12) @Field(() => String) actorPassword: string;
}

@InputType()
class AISearch {                                   // not exported on purpose
  @IsOptional() @Field(() => String, { nullable: true }) text?: string;
}

@InputType()
export class AgentsInquiry {
  @IsNotEmpty() @Min(1) @Field(() => Int) page: number;
  @IsNotEmpty() @Min(1) @Field(() => Int) limit: number;
  @IsOptional() @IsIn(availableAgentSorts) @Field(() => String, { nullable: true }) sort?: string;
  @IsOptional() @Field(() => Direction, { nullable: true }) direction?: Direction;
  @IsNotEmpty() @Field(() => AISearch) search: AISearch;
}
```

**Every list query takes exactly one argument of this shape:** `{ page, limit, sort?, direction?, search }`.
`sort` is a raw string constrained by `@IsIn(availableXSorts)` from `libs/config.ts` — this is the
guard against arbitrary-field sort injection.

Foreign keys the *server* fills in (never the client) are declared without `@Field`:

```ts
  //@ts-ignore
  actorId?: ObjectId;         // assigned in the resolver from @AuthMember("_id")
```

### 7.3 `<entity>.update.ts` — `@InputType()` update payload

* `_id` is `@IsNotEmpty() @Field(() => String)` — required.
* Every other field is `@IsOptional()` + `{ nullable: true }`.
* `deletedAt?: Date` is declared **without** `@Field` — set server-side on soft delete.

```ts
@InputType()
export class ActorUpdate {
  @IsNotEmpty() @Field(() => String)
  //@ts-ignore
  _id: ObjectId;

  @IsOptional() @Field(() => ActorType, { nullable: true }) actorType?: ActorType;
  @IsOptional() @Field(() => ActorStatus, { nullable: true }) actorStatus?: ActorStatus;
  @IsOptional() @Length(3, 12) @Field(() => String, { nullable: true }) actorNick?: string;
  @IsOptional() @Length(5, 12) @Field(() => String, { nullable: true }) actorPassword?: string;

  deletedAt?: Date;           // server-set only
}
```

---

## 8. Feature Module Layer (`src/components/<feature>/`)

Exactly three files per feature: `module`, `resolver`, `service`. Nothing else. No repository layer,
no mapper layer — the service talks to Mongoose directly.

### 8.1 `<feature>.module.ts`

```ts
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Actor', schema: ActorSchema }]),   // string token!
    AuthModule,
    ViewModule,
  ],
  providers: [ActorResolver, ActorService],
  exports: [ActorService],          // export whenever another feature needs the service
})
export class ActorModule {}
```

* Model registration always uses a **string name token** (`'Actor'`), matched by
  `@InjectModel('Actor')` in the service.
* A module imports `AuthModule` if its resolver uses any guard.
* A module imports `ViewModule` if it records views.
* Cross-feature counter updates are done by importing the owning feature's module and calling its
  exported service (e.g. `ResourceModule` imports `ActorModule` to bump `actorResources`).
* Feature modules with no code yet still exist as empty stubs so the aggregator compiles:
  ```ts
  @Module({})
  export class LikeModule {}
  ```

### 8.2 `<feature>.resolver.ts` — thin

Responsibilities, and only these:

1. Declare `@Query` / `@Mutation` with an explicit return type.
2. Attach `@Roles(...)` + `@UseGuards(...)`.
3. Pull the caller out with `@AuthMember(...)`.
4. `console.log('Mutation: name')` / `console.log('Query: name')` as the first statement.
5. Convert string ids with `shapeIntoMongoObjectId(...)`.
6. Delegate to the service. **No business logic, no DB access.**

```ts
@Resolver()
export class ActorResolver {
  constructor(private readonly actorService: ActorService) {}

  @Mutation(() => Actor)                                       // public
  public async signup(@Args('input') input: ActorInput): Promise<Actor> {
    console.log('Mutation: signup');
    return this.actorService.signup(input);
  }

  @UseGuards(AuthGuard)                                        // must be logged in
  @Mutation(() => Actor)
  public async updateActor(
    @Args('input') input: ActorUpdate,
    //@ts-ignore
    @AuthMember('_id') actorId: ObjectId,
  ): Promise<Actor> {
    console.log('Mutation: updateActor');
    //@ts-ignore
    delete input._id;                                          // caller can only update self
    return await this.actorService.updateActor(actorId, input);
  }

  @UseGuards(WithoutGuard)                                     // optional auth
  @Query(() => Actor)
  public async getActor(
    @Args('actorId') input: string,
    @AuthMember('_id') actorId: mongoose.ObjectId,
  ): Promise<Actor> {
    console.log('Query: getActor');
    const targetId = shapeIntoMongoObjectId(input);
    return await this.actorService.getActor(actorId, targetId);
  }

  /** ADMIN **/
  // Authorization: ADMIN
  @Roles(ActorType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Actors)
  public async getAllActorsByAdmin(@Args('input') input: ActorsInquiry): Promise<Actors> {
    console.log('Query: getAllActorsByAdmin');
    return await this.actorService.getAllActorsByAdmin(input);
  }
}
```

**Resolver method naming convention**

| Operation | Name |
|---|---|
| Create | `create<Entity>` |
| Read one | `get<Entity>` |
| Read list (public) | `get<Plural>` |
| Update own | `update<Entity>` |
| Admin list | `getAll<Plural>ByAdmin` |
| Admin update | `update<Plural>ByAdmin` |
| Admin remove | `remove<Entity>ByAdmin` |
| Auth | `signup`, `login`, `checkAuth`, `checkAuthRoles` |
| Upload | `imageUploader`, `imagesUploader` |

Admin endpoints are grouped at the bottom of the file under a `/** ADMIN **/` banner comment.

### 8.3 `<feature>.service.ts` — all business logic

```ts
@Injectable()
export class ActorService {
  constructor(
    @InjectModel('Actor') private readonly actorModel: Model<Actor>,
    private authService: AuthService,
    private viewService: ViewService,
  ) {}
  ...
}
```

**Create — try/catch, hash secrets, issue token, translate driver errors**

```ts
public async signup(input: ActorInput): Promise<Actor> {
  try {
    input.actorPassword = await this.authService.hashPassword(input.actorPassword);
    const result = await this.actorModel.create(input);
    result.accessToken = await this.authService.createToken(result);
    return result;
  } catch (err) {
    console.log('Error, Service.model', err);
    throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
  }
}
```

**Login — explicit `.select('+password')`, status checks before password check**

```ts
public async login(input: LoginInput): Promise<Actor> {
  const { actorNick, actorPassword } = input;
  const response: Actor | null = await this.actorModel
    .findOne({ actorNick })
    .select('+actorPassword')
    .exec();

  if (!response || response.actorStatus === ActorStatus.DELETE) throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
  else if (response.actorStatus === ActorStatus.BLOCK) throw new InternalServerErrorException(Message.BLOCKED_USER);

  const isMatch = await this.authService.comparePasswords(actorPassword, response.actorPassword);
  if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

  response.accessToken = await this.authService.createToken(response);
  return response;
}
```

**Update — scoped by status, re-issue token, throw on miss**

```ts
public async updateActor(actorId: ObjectId, input: ActorUpdate): Promise<Actor> {
  const result: Actor = await this.actorModel
    .findOneAndUpdate({ _id: actorId, actorStatus: ActorStatus.ACTIVE }, input, { new: true })
    .exec();
  if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
  result.accessToken = await this.authService.createToken(result);
  return result;
}
```

**Read one — record a view and increment the counter, only for logged-in viewers**

```ts
public async getActor(actorId: ObjectId, targetId: ObjectId): Promise<Actor> {
  const search: T = { _id: targetId, actorStatus: { $in: [ActorStatus.ACTIVE, ActorStatus.BLOCK] } };
  const target = await this.actorModel.findOne(search).lean().exec();
  if (!target) throw new InternalServerErrorException(Message.NOT_DATA_FOUND);

  if (actorId) {
    const viewInput: ViewInput = { actorId, viewRefId: targetId, viewGroup: ViewGroup.ACTOR };
    const newView = await this.viewService.recordView(viewInput);
    if (newView) {
      await this.actorModel.findByIdAndUpdate(search, { $inc: { actorViews: 1 } }, { new: true }).exec();
      target.actorViews++;
    }
  }
  return target;
}
```

**List — the canonical `$match -> $sort -> $facet` aggregation. Reuse verbatim for every list query.**

```ts
public async getAgents(actorId: ObjectId, input: AgentsInquiry): Promise<Actors> {
  const { text } = input.search;
  const match: T = { actorType: ActorType.AGENT, actorStatus: ActorStatus.ACTIVE };
  const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

  if (text) match.actorNick = { $regex: new RegExp(text, 'i') };
  console.log('match', match);

  const result = await this.actorModel.aggregate([
    { $match: match },
    { $sort: sort },
    {
      $facet: {
        list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
        metaCounter: [{ $count: 'total' }],
      },
    },
  ]);
  if (!result.length) throw new InternalServerErrorException(Message.NOT_DATA_FOUND);
  return result[0];
}
```

The `match` object is built **incrementally with `if` guards** — one `if` per optional search field.
For range filters use `match.resourcePrice = { $gte: range.start, $lte: range.end }`; for multi-select
use `match.resourceType = { $in: typeList }`.

**Counter maintenance — every entity that owns counters exposes a `StatsEditor`**

```ts
public async actorStatsEditor(input: StatisticModifier): Promise<Actor> {
  const { _id, targetKey, modifier } = input;
  return await this.actorModel
    .findOneAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
    .exec();
}
```

Called from the *other* feature's service after a successful write:

```ts
// inside ResourceService.createResource
await this.actorService.actorStatsEditor({ _id: result.actorId, targetKey: 'actorResources', modifier: 1 });
```

**Small helper services** stay minimal — public method + `private` existence check:

```ts
@Injectable()
export class ViewService {
  constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

  public async recordView(input: ViewInput): Promise<View | null> {
    const viewExist = await this.checkViewExistance(input);
    if (!viewExist) {
      console.log('- New View Insert -');
      return await this.viewModel.create(input);
    } else return null;
  }

  private async checkViewExistance(input: ViewInput): Promise<View> {
    const { actorId, viewRefId } = input;
    const search: T = { actorId, viewRefId };
    return await this.viewModel.findOne(search).exec();
  }
}
```

**Service conventions checklist**

* Every method is `public async` (or `private async` for helpers) with an explicit `Promise<T>` return type.
* Throw `BadRequestException` for write/driver failures, `InternalServerErrorException` for
  not-found / update-failed / auth failures, always with a `Message.*` constant.
* `.exec()` on every query. `.lean()` when the result is only read.
* `{ new: true }` on every `findOneAndUpdate`.
* Never `deleteOne` — set `deletedAt` and flip the status to `DELETE`.

---

## 9. Auth Subsystem

`components/auth/` is a **shared feature module**: it owns no schema and exports `AuthService`,
which is consumed by the guards.

### `auth.module.ts` — JWT configured async from `ConfigService`

```ts
@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('SECRET_TOKEN');
        if (!secret) throw new Error('SECRET_TOKEN is not configured');
        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

### `auth.service.ts` — four methods, no more

```ts
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);
  }

  public async comparePasswords(password: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(password, hashed);
  }

  /** Whole document becomes the JWT payload, minus the password. */
  public async createToken(actor: Actor): Promise<string> {
    const payload: T = {};
    Object.keys(actor['_doc'] ? actor['_doc'] : actor).map((ele) => {
      payload[`${ele}`] = actor[`${ele}`];
    });
    delete payload.actorPassword;
    return await this.jwtService.signAsync(payload);
  }

  /** Decoded payload IS the actor object; `_id` is re-hydrated into an ObjectId. */
  public async verifyToken(token: string): Promise<Actor> {
    const actor = await this.jwtService.verifyAsync(token);
    actor._id = shapeIntoMongoObjectId(actor._id);
    return actor;
  }
}
```

> Consequence of this design: **no DB lookup on each request** — the guards trust the token payload.
> Keep it, but be aware role/status changes only take effect at the next login.

### Three guards — pick one per endpoint

| Guard | Behaviour | Use on |
|---|---|---|
| `AuthGuard` | Requires `Authorization: Bearer <token>`; throws `TOKEN_NOT_EXIST` / `NOT_AUTHENTICATED` | any logged-in-only endpoint |
| `RolesGuard` | Same, plus checks `authMember.actorType` against `@Roles(...)` metadata; throws `ONLY_SPECIFIC_ROLES_ALLOWED` | role-restricted + all admin endpoints |
| `WithoutGuard` | Token optional; sets `authMember` to the actor or `null`, never throws | public reads that behave differently when logged in (view counting, "liked by me") |

All three follow the same body:

```ts
async canActivate(context: ExecutionContext | any): Promise<boolean> {
  console.info('--- @guard() Authentication [AuthGuard] ---');

  if (context.contextType === 'graphql') {
    const request = context.getArgByIndex(2).req;         // 3rd resolver arg = GraphQL context
    const bearerToken = request.headers.authorization;
    if (!bearerToken) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

    const [type, token] = bearerToken.split(' ');
    if (type !== 'Bearer' || !token) throw new BadRequestException(Message.TOKEN_NOT_EXIST);

    let authMember;
    try {
      authMember = await this.authService.verifyToken(token);
    } catch (err) {
      throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
    }
    if (!authMember) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

    request.body.authMember = authMember;                 // <- handed to @AuthMember()
    return true;
  }
  return true;
  // description => http, rpc, gprs and etc are ignored
}
```

`RolesGuard` reads metadata first and short-circuits when the handler has no `@Roles`:

```ts
const roles = this.reflector.get<string[]>('roles', context.getHandler());
if (!roles) return true;
...
const hasPermission = roles.includes(authMember.actorType);
if (!hasPermission) throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
```

### Decorators

```ts
// roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// authMember.decorator.ts — param decorator; `@AuthMember()` -> whole actor, `@AuthMember('_id')` -> one field
export const AuthMember = createParamDecorator((data: string, context: ExecutionContext | any) => {
  let request: any;
  if (context.contextType === 'graphql') {
    request = context.getArgByIndex(2).req;
    if (request.body.authMember) {
      request.body.authMember.authorization = request.headers?.authorization;
    }
  } else request = context.switchToHttp().getRequest();

  const member = request.body.authMember;
  if (member) return data ? member?.[data] : member;
  else return null;
});
```

**Decorator order on a resolver method is fixed:**

```ts
@Roles(ActorType.AGENT)      // 1. metadata
@UseGuards(RolesGuard)       // 2. guard
@Mutation(() => Resource)    // 3. GraphQL operation
public async createResource(...) {}
```

### Ownership rule

Guards answer *"who are you?"*. **Ownership is enforced in the service**, by folding the caller's id
into the query filter — never by fetching then comparing:

```ts
{ _id: input._id, actorId: actorId, resourceStatus: ResourceStatus.ACTIVE }
```

---

## 10. File Upload Pattern

Two mutations live on the actor resolver (`imageUploader`, `imagesUploader`), guarded by `AuthGuard`.
Files stream to `./uploads/<target>/<uuid><ext>` and the **relative URL string is returned**; the
client then passes that string into the create/update input. Images are never stored as binary in Mongo.

```ts
@UseGuards(AuthGuard)
@Mutation((returns) => String)
public async imageUploader(
  @Args({ name: 'file', type: () => GraphQLUpload }) file: Promise<FileUpload> | FileUpload,
  @Args('target') target: String,
): Promise<string> {
  console.log('Mutation: imageUploader');
  const { createReadStream, filename, mimetype } = await file;

  if (!filename) throw new Error(Message.UPLOAD_FAILED);
  if (!isValidImage(filename, mimetype)) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

  const imageName = getSerialForImage(filename);
  const url = `uploads/${target}/${imageName}`;
  const stream = createReadStream();

  const result = await new Promise((resolve, reject) => {
    stream.pipe(createWriteStream(url))
      .on('finish', async () => resolve(true))
      .on('error', () => reject(false));
  });
  if (!result) throw new Error(Message.UPLOAD_FAILED);
  return url;
}
```

The multi-file variant maps over `files: Promise<FileUpload>[]`, writes each into
`uploadedImages[index]` to preserve order, swallows per-file errors, and `await Promise.all(...)`.

**Setup checklist for uploads**

1. `graphql-upload@^13` (v13 is CommonJS — v14+ is ESM and will break this setup).
2. `uploads: false` in the GraphQL module options (with `//@ts-ignore`).
3. `app.use(graphqlUploadExpress({ maxFileSize, maxFiles }))` in `main.ts`.
4. `app.use('/uploads', express.static('./uploads'))` to serve them back.
5. Create the target sub-directories (`uploads/<actor>/`, `uploads/<resource>/`) — the stream will
   not create them.

---

## 11. Batch App (`apps/<project>-batch`)

Separate Nest application in the same monorepo, generated with
`nest generate app <project>-batch`. Minimal by design:

```ts
// main.ts
const app = await NestFactory.create(BatchModule);
await app.listen(process.env.PORT_BATCH ?? 3000);

// <project>-batch.module.ts
@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
```

It is where `@nestjs/schedule` cron jobs go: rank recalculation, expiring stale records,
sending queued notifications. Run with `npm run start:dev:batch`.

---

## 12. Code Style

From `.prettierrc` (repo root):

```json
{
  "tabWidth": 2,
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "printWidth": 120,
  "endOfLine": "auto"
}
```

ESLint: flat config (`eslint.config.mjs`) with `tseslint.configs.recommendedTypeChecked` +
`eslint-plugin-prettier/recommended`, with `@typescript-eslint/no-explicit-any` **off**
(the `T` type is used everywhere) and `no-floating-promises` / `no-unsafe-argument` at `warn`.

Other observed conventions:

* Import order: `@nestjs/*` -> third-party -> relative DTOs -> enums -> services.
* Relative imports inside `src` (`'../../libs/dto/actor/actor'`), no path aliases.
* `//@ts-ignore` is used pragmatically where `ObjectId` typing between `mongoose` and `bson`
  conflicts — acceptable, keep it narrow and on its own line.
* `console.log` is the logging mechanism in resolvers/services; the `Logger` class is used only in
  the interceptor.
* Section banners in resolvers: `/** ADMIN **/`, `/** UPLOADER **/`.

---

## 13. Build Order — follow this sequence

Build **vertically, one feature at a time**, not layer-by-layer. Each step should compile and be
testable in the GraphQL playground before moving on.

**Phase 0 — Skeleton**
1. `nest new <project>` -> then `nest generate app <project>-batch` (this flips the repo to monorepo mode).
2. Install: `@nestjs/graphql @nestjs/apollo @apollo/server graphql @nestjs/mongoose mongoose @nestjs/config @nestjs/jwt bcryptjs class-validator class-transformer graphql-upload@13 uuid @nestjs/schedule @nestjs/axios`.
3. Write `.env`, `.gitignore` (add `uploads`), `.prettierrc`.
4. `main.ts` + `app.module.ts` + `database/database.module.ts` + `app.resolver.ts`.
5. Confirm `sayHello` works at `/graphql` and Mongo logs "connected".

**Phase 1 — Shared foundation**
6. `libs/types/common.ts` (`T`, `StatisticModifier`).
7. `libs/enums/common.enum.ts` (`Message`, `Direction`).
8. `libs/enums/*.enum.ts` for every entity you sketched in §2 — write all of them now, they're cheap.
9. `libs/config.ts` (sort whitelists, image helpers, `shapeIntoMongoObjectId`).
10. `libs/interceptor/Logging.interceptor.ts` and wire it in `main.ts`.
11. `schemas/*.model.ts` for every entity — all of them now, they're cheap too.

**Phase 2 — Auth + Actor** (the biggest step; everything else depends on it)
12. `components/auth/` — module, service, `roles.decorator`, `authMember.decorator`, three guards.
13. `libs/dto/<actor>/` — `<actor>.ts`, `<actor>.input.ts`, `<actor>.update.ts`.
14. `components/<actor>/` — module, service (`signup`, `login`, `updateActor`), resolver.
15. `components/components.module.ts` + stub modules for every not-yet-built feature.
16. Verify: signup -> login -> `checkAuth` -> `checkAuthRoles` in the playground with a Bearer token.

**Phase 3 — Engagement primitives**
17. `view/` module + service (`recordView`, `checkViewExistance`) — needed before any `get<Entity>`.
18. Add `getActor` / `getAgents` / `getAll<Plural>ByAdmin` / `update<Plural>ByAdmin` to the actor feature.
19. Add `<actor>StatsEditor`.

**Phase 4 — Uploads**
20. `imageUploader` / `imagesUploader` on the actor resolver; create `uploads/<target>/` dirs.

**Phase 5 — Primary resource**
21. `libs/dto/<resource>/` (three files) -> `components/<resource>/` (module/service/resolver).
22. `createResource` (with `actorStatsEditor` bump) -> `getResource` (with view recording) ->
    `getResources` (faceted search) -> `updateResource` -> admin endpoints.

**Phase 6 — Remaining features**, each following the identical vertical slice:
`like/` -> `comment/` -> `follow/` -> `<secondary-content>/` -> `notice/` -> `notification/`.

**Phase 7 — Batch app**: cron jobs for ranks/cleanup.

---

## 14. Checklist for every new feature

- [ ] `libs/enums/<entity>.enum.ts` with `registerEnumType` for each enum
- [ ] `schemas/<Entity>.model.ts` — timestamps, collection name, counters defaulting to 0, indexes, `deletedAt`
- [ ] `libs/dto/<entity>/<entity>.ts` — `@ObjectType()` + `<Plural>` list wrapper with `list` + `metaCounter`
- [ ] `libs/dto/<entity>/<entity>.input.ts` — `<Entity>Input`, private `XXSearch`, `<Plural>Inquiry`
- [ ] `libs/dto/<entity>/<entity>.update.ts` — required `_id`, everything else optional
- [ ] Sort whitelist added to `libs/config.ts` and referenced via `@IsIn(...)`
- [ ] `components/<entity>/<entity>.module.ts` — `forFeature` string token, `AuthModule`, exports service if shared
- [ ] `components/<entity>/<entity>.service.ts` — create/read/list(`$facet`)/update/soft-delete + `<entity>StatsEditor`
- [ ] `components/<entity>/<entity>.resolver.ts` — thin, guarded, `console.log` per operation, `/** ADMIN **/` section
- [ ] Module registered in `components.module.ts`
- [ ] Counter bumps wired through the owning feature's `StatsEditor`
- [ ] Every error path throws a `Message.*` constant, never a raw string

---

## 15. Known rough edges in the reference project (do better)

These exist in the source codebase. They are documented so you recognise them, not so you copy them:

* **Typos in constants** — `SOMETHING__WENT_WRONG` (double underscore), `viewRefid` in the View DTO
  vs `viewRefId` in the schema, `match.MemberStatus` (capital M) in `getAllMembersByAdmin`. Keep
  DTO field names byte-identical to schema field names.
* **`//@ts-ignore` density** — mostly caused by mixing `mongoose`'s `ObjectId` type with `bson`'s.
  Pick one `ObjectId` import source project-wide and most of them disappear.
* **`findByIdAndUpdate(search, ...)`** is called with a filter object where an id is expected in
  `getMember`. Use `findOneAndUpdate(search, ...)` in your version.
* **JWT carries the full document**, so a blocked or demoted user keeps their privileges until the
  token expires (30d). If your domain needs immediate revocation, re-check status in the guard.
* **`console.log` everywhere** instead of the Nest `Logger`. Acceptable for learning; consider
  `Logger` with context strings in production.
* **No unit tests** beyond the generated e2e stub. The structure is test-friendly (services are
  plain injectables) — add `*.spec.ts` next to each service if the project needs them.
