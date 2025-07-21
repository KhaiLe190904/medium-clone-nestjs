import { Module } from '@nestjs/common';
import { ArticleService } from '@/features/article/service/article.service';
import { ArticleController } from '../controller/article.controller';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [ArticleService, PrismaService, OptionalJwtAuthGuard],
  controllers: [ArticleController],
  exports: [ArticleService],
})
export class ArticleModule {}
