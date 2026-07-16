import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaymentStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private snap: any;
  private readonly pricePerCredit: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.pricePerCredit =
      this.config.get<number>('pro.pricePerCredit') ?? 25000;
    this.snap = new midtransClient.Snap({
      isProduction: this.config.get<boolean>('midtrans.isProduction'),
      serverKey: this.config.get<string>('midtrans.serverKey'),
      clientKey: this.config.get<string>('midtrans.clientKey'),
    });
  }

  async createTransaction(userId: string, dto: CreatePaymentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const grossAmount = dto.credits * this.pricePerCredit;
    const orderId = `KD-${userId.slice(0, 8)}-${Date.now()}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        orderId,
        grossAmount,
        creditsBought: dto.credits,
        status: PaymentStatus.PENDING,
      },
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
      },
      item_details: [
        {
          id: 'PREP_CREDIT',
          price: this.pricePerCredit,
          quantity: dto.credits,
          name: 'KakiDaki Prep Credit',
        },
      ],
    };

    const transaction = await this.snap.createTransaction(parameter);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        snapToken: transaction.token,
        snapRedirectUrl: transaction.redirect_url,
      },
    });

    return {
      orderId,
      grossAmount,
      credits: dto.credits,
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
    };
  }

  /**
   * Handles Midtrans webhook notification and fulfills credits on success.
   */
  /**
   * Verify Midtrans notification signature:
   * SHA512(order_id + status_code + gross_amount + server_key)
   */
  verifySignature(payload: any): boolean {
    const serverKey = this.config.get<string>('midtrans.serverKey') ?? '';
    const raw =
      `${payload.order_id}${payload.status_code}` +
      `${payload.gross_amount}${serverKey}`;
    const expected = crypto
      .createHash('sha512')
      .update(raw)
      .digest('hex');
    return expected === payload.signature_key;
  }

  async handleNotification(payload: any) {
    if (!this.verifySignature(payload)) {
      this.logger.warn(
        `Invalid signature for order ${payload.order_id}`,
      );
      throw new ForbiddenException('Invalid signature');
    }

    const orderId = payload.order_id;
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment) {
      this.logger.warn(`Notification for unknown order: ${orderId}`);
      return { received: true };
    }

    let newStatus: PaymentStatus = payment.status;

    if (
      transactionStatus === 'capture' ||
      transactionStatus === 'settlement'
    ) {
      if (fraudStatus === 'accept' || !fraudStatus) {
        newStatus = PaymentStatus.PAID;
      }
    } else if (transactionStatus === 'pending') {
      newStatus = PaymentStatus.PENDING;
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel'
    ) {
      newStatus = PaymentStatus.FAILED;
    } else if (transactionStatus === 'expire') {
      newStatus = PaymentStatus.EXPIRED;
    } else if (transactionStatus === 'refund') {
      newStatus = PaymentStatus.REFUNDED;
    }

    const wasPaid = payment.status === PaymentStatus.PAID;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          status: newStatus,
          paymentType: payload.payment_type,
          rawPayload: payload,
        },
      });

      // Fulfill credits only on first transition to PAID
      if (newStatus === PaymentStatus.PAID && !wasPaid) {
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            prepCredits: { increment: payment.creditsBought },
            isPro: true,
          },
        });
      }
    });

    return { received: true, status: newStatus };
  }

  listMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  getPricing() {
    return { pricePerCredit: this.pricePerCredit, currency: 'IDR' };
  }
}
