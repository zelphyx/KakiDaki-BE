import { PrismaClient, Difficulty } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ===== Mountains =====
  const mountains = [
    {
      name: 'Gunung Semeru',
      elevationM: 3676,
      difficulty: Difficulty.EXTREME,
      distanceToPeakKm: 13.5,
      baseTempC: 10,
      latitude: -8.1077,
      longitude: 112.922,
      description: 'Puncak tertinggi di Pulau Jawa (Mahameru).',
    },
    {
      name: 'Gunung Rinjani',
      elevationM: 3726,
      difficulty: Difficulty.HARD,
      distanceToPeakKm: 10.5,
      baseTempC: 12,
      latitude: -8.4142,
      longitude: 116.4576,
      description: 'Gunung berapi kedua tertinggi di Indonesia, NTB.',
    },
    {
      name: 'Gunung Prau',
      elevationM: 2590,
      difficulty: Difficulty.EASY,
      distanceToPeakKm: 4.2,
      baseTempC: 8,
      latitude: -7.1969,
      longitude: 109.9169,
      description: 'Populer untuk pemula, golden sunrise Dieng.',
    },
    {
      name: 'Gunung Gede',
      elevationM: 2958,
      difficulty: Difficulty.MODERATE,
      distanceToPeakKm: 8.0,
      baseTempC: 14,
      latitude: -6.7871,
      longitude: 106.9829,
      description: 'Taman Nasional Gede Pangrango, Jawa Barat.',
    },
  ];

  for (const m of mountains) {
    await prisma.mountain.upsert({
      where: { name: m.name },
      update: m,
      create: m,
    });
  }
  console.log(`Seeded ${mountains.length} mountains`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
