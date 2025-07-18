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

@Controller('api/users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UsePipes(new ValidationPipe())
  @Post()
  async register(@Body('user') createUserDto: UserDto) {
    const user = await this.authService.register(createUserDto);
    return user;
  }

  @Post('login')
  async login(@Body('user') loginUserDto: UserLoginDto) {
    const user = await this.authService.validateUser(loginUserDto);
    return user;
  }
}
