import { ArticleService } from '@/features/article/service/article.service';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
  Put,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import { ListArticlesDto } from '../dto/list-articles.dto';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { CreateArticleDto } from '@/features/article/dto/create-article.dto';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { UpdateArticleDto } from '@/features/article/dto/update-article.dto';
import { I18nLang, I18nService } from 'nestjs-i18n';

@Controller('api/articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Query() queryDto: ListArticlesDto,
    @Request() req: any,
    @I18nLang() lang: string,
  ) {
    const currentUserId = req.user?.id;
    return this.articleService.findAll(queryDto, currentUserId, lang);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param('slug') slug: string,
    @Request() req: any,
    @I18nLang() lang: string,
  ) {
    const currentUserId = req.user?.id;
    return this.articleService.findOne(slug, currentUserId, lang);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body('article') createArticleDto: CreateArticleDto,
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
    return this.articleService.create(createArticleDto, currentUserId, lang);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('slug') slug: string,
    @Body('article') updateArticleDto: UpdateArticleDto,
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
    return this.articleService.update(
      slug,
      updateArticleDto,
      currentUserId,
      lang,
    );
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('slug') slug: string,
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
    return this.articleService.delete(slug, currentUserId, lang);
  }

  @Post(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async favorite(
    @Param('slug') slug: string,
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
    return this.articleService.favorite(slug, currentUserId, lang);
  }

  @Delete(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async unfavorite(
    @Param('slug') slug: string,
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
    return this.articleService.unfavorite(slug, currentUserId, lang);
  }
}
