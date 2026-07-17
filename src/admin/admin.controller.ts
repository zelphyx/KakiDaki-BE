import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { BlockCommentDto, AdminCreateMountainDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users.',
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
          isPro: false,
          prepCredits: 1,
          createdAt: '2026-07-17T10:00:00.000Z'
        }
      ]
    }
  })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Post('comments/:id/block')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Block an inappropriate comment (Admin only)' })
  blockComment(
    @Param('id') id: string,
    @Body() dto: BlockCommentDto,
  ) {
    return this.adminService.blockComment(id, dto);
  }

  @Post('mountains')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually add a mountain (Admin only)' })
  createMountain(@Body() dto: AdminCreateMountainDto) {
    return this.adminService.createMountain(dto);
  }

  // Temporary endpoint for testing
  @Post('make-me-admin')
  @ApiOperation({ summary: 'TEMPORARY: Elevate current user to ADMIN role' })
  async makeMeAdmin(@CurrentUser('userId') userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.ADMIN },
    });
    return {
      message: 'You are now an ADMIN. Please re-login to get a new JWT token with the ADMIN role.',
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}
