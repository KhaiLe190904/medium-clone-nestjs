import { CommentService } from '@/features/comment/service/comment.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { CreateCommentDto } from '@/features/comment/dto/create-comment.dto';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { I18nLang, I18nService } from 'nestjs-i18n';

@Controller('api/articles/:slug/comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('slug') slug: string,
    @Body('comment') createCommentDto: CreateCommentDto,
    @Request() req: any,
    @I18nLang() lang: string,
  ) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      const message = await this.i18n.translate(
        'auth.authentication_required',
        { lang },
      );
      throw new UnauthorizedException(message);
    }
    return this.commentService.createComment(
      slug,
      createCommentDto,
      currentUserId,
      lang,
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getCommentsFromArticle(
    @Param('slug') slug: string,
    @Request() req: any,
    @I18nLang() lang: string,
  ) {
    const currentUserId = req.user?.id || null;
    return this.commentService.getCommentsFromArticle(
      slug,
      currentUserId,
      lang,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Request() req: any,
    @I18nLang() lang: string,
  ) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      const message = await this.i18n.translate(
        'auth.authentication_required',
        { lang },
      );
      throw new UnauthorizedException(message);
    }
    return this.commentService.deleteComment(slug, id, currentUserId, lang);
  }
}
