import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserDto } from '@/features/authentication/dto/user.dto';
import * as bcrypt from 'bcrypt';
import { UserLoginDto } from '@/features/authentication/dto/userLogin.dto';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
  ) {}

  async register(createUserDto: UserDto, lang?: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

    if (user) {
      const message = await this.i18n.translate(
        'auth.user_already_exists',
        { lang },
      );
      throw new BadRequestException(message);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    return newUser;
  }

  async validateUser(loginUserDto: UserLoginDto, lang?: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginUserDto.email,
      },
    });

    if (!user) {
      const message = await this.i18n.translate(
        'auth.invalid_credentials',
        { lang },
      );
      throw new UnauthorizedException(message);
    }

    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.password,
    );

    if (isPasswordValid) {
      const payload = { id: user.id, email: user.email };
      user.token = this.jwtService.sign(payload);
      return user;
    }

    const message = await this.i18n.translate(
      'auth.invalid_credentials',
      { lang },
    );
    throw new UnauthorizedException(message);
  }
}
