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
} from '@nestjs/common';
import { ListArticlesDto } from '../dto/list-articles.dto';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';
import { CreateArticleDto } from '@/features/article/dto/create-article.dto';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';

@Controller('api/articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Query() queryDto: ListArticlesDto, @Request() req: any) {
    const currentUserId = req.user?.id;
    return this.articleService.findAll(queryDto, currentUserId);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('slug') slug: string, @Request() req: any) {
    const currentUserId = req.user?.id;
    return this.articleService.findOne(slug, currentUserId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body('article') createArticleDto: CreateArticleDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user?.id;
    return this.articleService.create(createArticleDto, currentUserId);
  }
}
