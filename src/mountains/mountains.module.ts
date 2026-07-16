import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MountainsService } from './mountains.service';
import { MountainsController } from './mountains.controller';
import { MountainDiscoveryService } from './mountain-discovery.service';

@Module({
  imports: [HttpModule],
  controllers: [MountainsController],
  providers: [MountainsService, MountainDiscoveryService],
  exports: [MountainsService],
})
export class MountainsModule {}
