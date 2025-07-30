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
import { I18nLang, I18nService } from 'nestjs-i18n';

@Controller('api')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly i18n: I18nService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getCurrentUser(@Request() req, @I18nLang() lang: string) {
    const user = await this.userService.getCurrentUser(req.user.id, lang);
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe())
  @Put('user')
  async updateUser(
    @Request() req,
    @Body('user') updateUserDto: UpdateUserDto,
    @I18nLang() lang: string,
  ) {
    const user = await this.userService.updateUser(
      req.user.id,
      updateUserDto,
      lang,
    );
    return { user };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('profiles/:username')
  async getProfile(
    @Param('username') username: string,
    @Request() req,
    @I18nLang() lang: string,
  ): Promise<ProfileResponse> {
    const currentUserId = req.user?.id;
    const profile = await this.userService.getProfile(
      username,
      currentUserId,
      lang,
    );
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profiles/:username/follow')
  async followUser(
    @Param('username') username: string,
    @Request() req,
    @I18nLang() lang: string,
  ): Promise<ProfileResponse> {
    const profile = await this.userService.followUser(
      username,
      req.user.id,
      lang,
    );
    return { profile };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profiles/:username/follow')
  async unfollowUser(
    @Param('username') username: string,
    @Request() req,
    @I18nLang() lang: string,
  ): Promise<ProfileResponse> {
    const profile = await this.userService.unfollowUser(
      username,
      req.user.id,
      lang,
    );
    return { profile };
  }
}
