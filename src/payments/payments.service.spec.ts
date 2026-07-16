import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const serverKey = 'SB-Mid-server-TESTKEY';

  const configMock = {
    get: (key: string) => {
      const map: Record<string, any> = {
        'pro.pricePerCredit': 25000,
        'midtrans.serverKey': serverKey,
        'midtrans.clientKey': 'SB-Mid-client-TEST',
        'midtrans.isProduction': false,
      };
      return map[key];
    },
  };

  const prismaMock = {};

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: configMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  describe('verifySignature', () => {
    const buildSignature = (
      orderId: string,
      statusCode: string,
      grossAmount: string,
    ) =>
      crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

    it('accepts a valid signature', () => {
      const payload = {
        order_id: 'KD-abc-123',
        status_code: '200',
        gross_amount: '25000.00',
        signature_key: buildSignature('KD-abc-123', '200', '25000.00'),
      };
      expect(service.verifySignature(payload)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      const payload = {
        order_id: 'KD-abc-123',
        status_code: '200',
        gross_amount: '25000.00',
        signature_key: 'deadbeef',
      };
      expect(service.verifySignature(payload)).toBe(false);
    });

    it('rejects when amount is tampered', () => {
      const payload = {
        order_id: 'KD-abc-123',
        status_code: '200',
        gross_amount: '999999.00',
        signature_key: buildSignature('KD-abc-123', '200', '25000.00'),
      };
      expect(service.verifySignature(payload)).toBe(false);
    });
  });

  describe('getPricing', () => {
    it('returns configured price in IDR', () => {
      expect(service.getPricing()).toEqual({
        pricePerCredit: 25000,
        currency: 'IDR',
      });
    });
  });
});
