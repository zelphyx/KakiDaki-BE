import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GoogleFitService } from './google-fit.service';
import { GoogleFitController } from './google-fit.controller';

@Global()
@Module({
  imports: [HttpModule],
  controllers: [GoogleFitController],
  providers: [GoogleFitService],
  exports: [GoogleFitService],
})
export class GoogleFitModule {}
