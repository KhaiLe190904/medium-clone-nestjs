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
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.articleService.create(createArticleDto, currentUserId);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('slug') slug: string,
    @Body('article') updateArticleDto: UpdateArticleDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.articleService.update(slug, updateArticleDto, currentUserId);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('slug') slug: string, @Request() req: any) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.articleService.delete(slug, currentUserId);
  }

  @Post(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async favorite(@Param('slug') slug: string, @Request() req: any) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.articleService.favorite(slug, currentUserId);
  }

  @Delete(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async unfavorite(@Param('slug') slug: string, @Request() req: any) {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.articleService.unfavorite(slug, currentUserId);
  }
}
