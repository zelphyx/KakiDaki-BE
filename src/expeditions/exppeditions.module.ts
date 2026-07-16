import { Module } from '@nestjs/common';
import { ExpeditionsService } from './expeditions.service';
import { ExpeditionsController } from './expeditions.controller';

@Module({
  controllers: [ExpeditionsController],
  providers: [ExpeditionsService],
  exports: [ExpeditionsService],
})
export class ExpeditionsModule {}