import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VisionService } from './vision.service';
import { VisionController } from './vision.controller';

@Module({
  imports: [HttpModule],
  providers: [VisionService],
  controllers: [VisionController],
  exports: [VisionService],
})
export class VisionModule {}