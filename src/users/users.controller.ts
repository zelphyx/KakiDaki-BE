import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssessmentDto } from './dto/assessment.dto';
import { FitnessProfileDto } from './dto/fitness-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(userId, dto);
  }

  @Post('me/assessment')
  @ApiOperation({ summary: 'Submit mandatory health assessment' })
  submitAssessment(
    @CurrentUser('userId') userId: string,
    @Body() dto: AssessmentDto,
  ) {
    return this.usersService.submitAssessment(userId, dto);
  }

  @Get('me/fitness-profile')
  @ApiOperation({ summary: 'Get fitness profile' })
  getFitnessProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getFitnessProfile(userId);
  }

  @Post('me/fitness-profile')
  @ApiOperation({ summary: 'Create or update manual fitness profile' })
  upsertFitnessProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: FitnessProfileDto,
  ) {
    return this.usersService.upsertFitnessProfile(userId, dto);
  }
}
