import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '@/features/authentication/service/auth.service';
import { UserLoginDto } from '@/features/authentication/dto/userLogin.dto';
import { UserDto } from '@/features/authentication/dto/user.dto';
import { I18nLang, I18nService } from 'nestjs-i18n';

@Controller('api/users')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
  ) {}

  @UsePipes(new ValidationPipe())
  @Post()
  async register(
    @Body('user') createUserDto: UserDto,
    @I18nLang() lang: string,
  ) {
    const user = await this.authService.register(createUserDto, lang);
    return user;
  }

  @Post('login')
  async login(
    @Body('user') loginUserDto: UserLoginDto,
    @I18nLang() lang: string,
  ) {
    const user = await this.authService.validateUser(loginUserDto, lang);
    return user;
  }
}
