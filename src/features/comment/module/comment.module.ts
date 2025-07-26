import { Module } from '@nestjs/common';
import { CommentService } from '@/features/comment/service/comment.service';
import { CommentController } from '@/features/comment/controller/comment.controller';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [CommentService, PrismaService, OptionalJwtAuthGuard],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule {}
