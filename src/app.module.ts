import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/features/authentication/module/auth.module';
import { UserModule } from '@/features/user/module/user.module';
import { ArticleModule } from '@/features/article/module/article.module';
import { CommentModule } from '@/features/comment/module/comment.module';
import { CustomI18nModule } from '@/i18n/i18n.module';

@Module({
  imports: [
    CustomI18nModule,
    PrismaModule,
    AuthModule,
    UserModule,
    ArticleModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
