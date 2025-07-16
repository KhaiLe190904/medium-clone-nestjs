import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserDto } from '@/features/authentication/dto/user.dto';
import * as bcrypt from 'bcrypt';
import { UserLoginDto } from '@/features/authentication/dto/userLogin.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) { }

    async register(createUserDto: UserDto) {

        const user = await this.prisma.user.findUnique({
            where: {
                email: createUserDto.email,
            },
        });

        if (user) {
            throw new BadRequestException('User already exists');
        }

        if (!createUserDto.username || !createUserDto.email || !createUserDto.password) {
            throw new BadRequestException('Invalid user data');
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

    async validateUser({ email, password }: UserLoginDto) {

        const user = await this.prisma.user.findUnique({
            where: {
                email: email,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            const payload = { id: user.id, email: user.email };
            return {
                user,
                token: this.jwtService.sign(payload),
            };
        }
        throw new UnauthorizedException('Invalid credentials');
    }
}
