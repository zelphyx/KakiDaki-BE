import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, AssessmentDto } from './dto/user.dto';
import { UpsertFitnessProfileDto } from './dto/fitness.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/assessment')
  @ApiOperation({
    summary: 'Submit mandatory health assessment (BMI + medical history)',
  })
  submitAssessment(
    @CurrentUser('userId') userId: string,
    @Body() dto: AssessmentDto,
  ) {
    return this.usersService.submitAssessment(userId, dto);
  }

  @Get('me/fitness-profile')
  @ApiOperation({ summary: 'Get my fitness capability profile' })
  getFitness(@CurrentUser('userId') userId: string) {
    return this.usersService.getFitnessProfile(userId);
  }

  @Post('me/fitness-profile')
  @ApiOperation({
    summary: 'Set/update fitness profile manually (computes capability score)',
  })
  upsertFitness(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpsertFitnessProfileDto,
  ) {
    return this.usersService.upsertFitnessProfile(userId, dto);
  }
}
