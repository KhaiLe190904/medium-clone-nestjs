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
import { UserService } from '@/features/user/service/user.service';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { ProfileResponse } from '@/features/user/dto/profile.dto';
import { UpdateUserDto } from '@/features/user/dto/updateUser.dto';

@Controller('api')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getCurrentUser(@Request() req) {
    const user = await this.userService.getCurrentUser(req.user.id);
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  @Put('user')
  async updateUser(@Request() req, @Body('user') updateUserDto: UpdateUserDto) {
    const user = await this.userService.updateUser(
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
    const profile = await this.userService.getProfile(
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
    const profile = await this.userService.followUser(username, req.user.id);
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profiles/:username/follow')
  async unfollowUser(
    @Param('username') username: string,
    @Request() req,
  ): Promise<ProfileResponse> {
    const profile = await this.userService.unfollowUser(
      username,
      req.user.id,
    );
    return { profile };
  }
}
