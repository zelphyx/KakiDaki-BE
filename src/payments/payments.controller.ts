import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get Pro credit pricing' })
  pricing() {
    return this.paymentsService.getPricing();
  }

  @Post('checkout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a Midtrans Snap transaction to buy prep credits',
  })
  checkout(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createTransaction(userId, dto);
  }

  @Post('notification')
  @ApiOperation({
    summary: 'Midtrans webhook notification endpoint (server-to-server)',
  })
  notification(@Req() req: Request) {
    return this.paymentsService.handleNotification(req.body);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List my payment history' })
  history(@CurrentUser('userId') userId: string) {
    return this.paymentsService.listMyPayments(userId);
  }
}
