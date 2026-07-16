import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import {
  CreateCommentDto,
  VoteDto,
  BlockCommentDto,
} from './dto/comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('mountains/:mountainId/comments')
  @ApiOperation({ summary: 'List comments for a mountain' })
  list(@Param('mountainId') mountainId: string) {
    return this.commentsService.listByMountain(mountainId);
  }

  @Post('comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Post a comment on a mountain' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(userId, dto);
  }

  @Post('comments/:id/vote')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upvote or downvote a comment' })
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.commentsService.vote(id, dto.vote);
  }

  @Delete('comments/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete your own comment' })
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.commentsService.remove(userId, id);
  }

  // ===== Admin moderation =====

  @Get('admin/comments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: '[Admin] List all comments (including blocked)',
  })
  adminList(@Query('mountainId') mountainId?: string) {
    return this.commentsService.listForAdmin(mountainId);
  }

  @Post('admin/comments/:id/block')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Block a comment' })
  block(@Param('id') id: string, @Body() dto: BlockCommentDto) {
    return this.commentsService.block(id, dto.reason);
  }

  @Post('admin/comments/:id/unblock')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Unblock a comment' })
  unblock(@Param('id') id: string) {
    return this.commentsService.unblock(id);
  }
}
