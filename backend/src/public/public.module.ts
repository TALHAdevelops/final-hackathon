import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { IssuesModule } from '../issues/issues.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [IssuesModule, AiModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
