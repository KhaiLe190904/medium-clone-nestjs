import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/features/authentication/module/auth.module';
import { ProfileModule } from '@/features/profile/module/profile.module';

@Module({
  imports: [PrismaModule, AuthModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
