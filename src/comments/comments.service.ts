import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommentDto) {
    const mountain = await this.prisma.mountain.findUnique({
      where: { id: dto.mountainId },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');

    return this.prisma.comment.create({
      data: {
        userId,
        mountainId: dto.mountainId,
        text: dto.text,
        imageUrl: dto.imageUrl,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  listByMountain(mountainId: string) {
    return this.prisma.comment.findMany({
      where: { mountainId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async vote(id: string, vote: 'up' | 'down') {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data:
        vote === 'up'
          ? { upvote: { increment: 1 } }
          : { downvote: { increment: 1 } },
    });
  }

  async remove(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }
}
