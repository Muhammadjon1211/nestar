import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { AppResolver } from './app.resolver';


@Module({
  imports: [ConfigModule.forRoot(), GraphQLModule.forRoot<ApolloDriverConfig>(
    {
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: true,
    })],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule { }
