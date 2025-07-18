import { Module } from '@nestjs/common';
import { ProfileController } from '@/features/profile/controller/profile.controller';
import { ProfileService } from '@/features/profile/service/profile.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    PrismaService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
