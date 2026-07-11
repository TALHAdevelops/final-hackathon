import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GrokService } from './grok.service';

@Module({
  providers: [AiService, GrokService],
  exports: [AiService],
})
export class AiModule {}
