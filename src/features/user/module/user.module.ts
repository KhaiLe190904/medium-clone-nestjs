import { Module } from '@nestjs/common';
import { UserService } from '@/features/user/service/user.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { UserController } from '@/features/user/controller/user.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [UserService],
})
export class UserModule {}
