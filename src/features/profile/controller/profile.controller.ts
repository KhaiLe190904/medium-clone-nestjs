import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  Put,
  UsePipes,
  ValidationPipe,
  Body,
} from '@nestjs/common';
import { ProfileService } from '@/features/profile/service/profile.service';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { ProfileResponse } from '@/features/profile/dto/profile.dto';
import { UpdateUserDto } from '@/features/profile/dto/updateUser.dto';

@Controller('api')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getCurrentUser(@Request() req) {
    const user = await this.profileService.getCurrentUser(req.user.id);
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  @Put('user')
  async updateUser(@Request() req, @Body('user') updateUserDto: UpdateUserDto) {
    const user = await this.profileService.updateUser(
      req.user.id,
      updateUserDto,
    );
    return { user };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('profiles/:username')
  async getProfile(
    @Param('username') username: string,
    @Request() req,
  ): Promise<ProfileResponse> {
    const currentUserId = req.user?.id;
    const profile = await this.profileService.getProfile(
      username,
      currentUserId,
    );
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profiles/:username/follow')
  async followUser(
    @Param('username') username: string,
    @Request() req,
  ): Promise<ProfileResponse> {
    const profile = await this.profileService.followUser(username, req.user.id);
    return { profile };
  }

  // DELETE /api/profiles/:username/follow - Authentication required
  @UseGuards(JwtAuthGuard)
  @Delete('profiles/:username/follow')
  async unfollowUser(
    @Param('username') username: string,
    @Request() req,
  ): Promise<ProfileResponse> {
    const profile = await this.profileService.unfollowUser(
      username,
      req.user.id,
    );
    return { profile };
  }
}
