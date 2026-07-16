import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeminiService } from './gemini.service';
import { AiReadinessService } from './ai-readiness.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [GeminiService, AiReadinessService],
  exports: [GeminiService, AiReadinessService],
})
export class AiModule {}
