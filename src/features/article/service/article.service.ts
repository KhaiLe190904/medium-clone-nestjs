import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ListArticlesDto,
  ListArticlesResponse,
} from '@/features/article/dto/list-articles.dto';
import { CreateArticleDto } from '@/features/article/dto/create-article.dto';
import slugify from 'slugify';
import { UpdateArticleDto } from '@/features/article/dto/update-article.dto';
import { I18nService } from 'nestjs-i18n';

export interface ArticleWithDetails {
  id: number;
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: number;
  favoritesCount: number;
  author: {
    id: number;
    username: string;
    bio: string | null;
    image: string | null;
  };
  favorites?: { id: number }[];
  _count: {
    favorites: number;
  };
}

export interface FormattedArticle {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  author: {
    username: string;
    bio: string;
    image: string;
    following: boolean;
  };
}
export interface ArticleResponse {
  article: FormattedArticle;
}

export interface DeleteArticleResponse {
  message: string;
}

@Injectable()
export class ArticleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private parseTagList(tagListJson: string): string[] {
    try {
      return JSON.parse(tagListJson);
    } catch {
      return [];
    }
  }

  private async checkFollowing(
    currentUserId: number | undefined,
    targetUserId: number,
  ): Promise<boolean> {
    if (!currentUserId || currentUserId === targetUserId) {
      return false;
    }

    const followRelation = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });
    return !!followRelation;
  }

  private async getFollowingMap(
    currentUserId: number | undefined,
    authorIds: number[],
  ): Promise<Map<number, boolean>> {
    const followingMap = new Map<number, boolean>();

    if (!currentUserId || authorIds.length === 0) {
      authorIds.forEach((id) => followingMap.set(id, false));
      return followingMap;
    }

    const followRelations = await this.prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: authorIds },
      },
      select: { followingId: true },
    });

    authorIds.forEach((id) => {
      followingMap.set(id, id === currentUserId ? false : false);
    });

    followRelations.forEach((relation) => {
      followingMap.set(relation.followingId, true);
    });

    return followingMap;
  }

  private async findArticleBySlug(
    slug: string,
    currentUserId?: number,
    lang?: string,
  ): Promise<ArticleWithDetails> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
            id: true,
          },
        },
        favorites: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
        _count: {
          select: { favorites: true },
        },
      },
    });

    if (!article) {
      const message = await this.i18n.translate('article.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    return article;
  }

  private async formatArticleResponse(
    article: ArticleWithDetails,
    currentUserId?: number,
  ): Promise<FormattedArticle> {
    const tagList = this.parseTagList(article.tagList);
    const following = await this.checkFollowing(
      currentUserId,
      article.author.id,
    );
    const favorited = Boolean(
      article.favorites && article.favorites.length > 0,
    );

    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tagList,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      favorited,
      favoritesCount: article._count.favorites,
      author: {
        username: article.author.username,
        bio: article.author.bio || '',
        image: article.author.image || '',
        following,
      },
    };
  }

  private async checkArticleOwnership(
    article: ArticleWithDetails,
    currentUserId: number,
    lang?: string,
  ): Promise<void> {
    if (article.author.id !== currentUserId) {
      const message = await this.i18n.translate('article.not_author', {
        lang,
      });
      throw new ForbiddenException(message);
    }
  }

  async create(
    createArticleDto: CreateArticleDto,
    currentUserId: number,
    lang?: string,
  ): Promise<ArticleResponse> {
    const { title, description, body, tagList } = createArticleDto;

    const slug = slugify(title, { lower: true, strict: true });

    const existingArticle = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (existingArticle) {
      const message = await this.i18n.translate(
        'article.title_already_exists',
        { lang },
      );
      throw new BadRequestException(message);
    }

    const newArticle = await this.prisma.article.create({
      data: {
        title,
        description,
        body,
        slug,
        tagList: JSON.stringify(tagList || []),
        authorId: currentUserId,
      },
      include: {
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
            id: true,
          },
        },
        _count: {
          select: { favorites: true },
        },
      },
    });

    const parsedTagList = this.parseTagList(newArticle.tagList);

    return {
      article: {
        slug: newArticle.slug,
        title: newArticle.title,
        description: newArticle.description,
        body: newArticle.body,
        tagList: parsedTagList,
        createdAt: newArticle.createdAt.toISOString(),
        updatedAt: newArticle.updatedAt.toISOString(),
        favorited: false,
        favoritesCount: newArticle._count.favorites,
        author: {
          username: newArticle.author.username,
          bio: newArticle.author.bio || '',
          image: newArticle.author.image || '',
          following: false, // User can't follow themselves
        },
      },
    };
  }

  async update(
    slug: string,
    updateArticleDto: UpdateArticleDto,
    currentUserId: number,
    lang?: string,
  ): Promise<ArticleResponse> {
    const { title, description, body } = updateArticleDto;

    if (!title && !description && !body) {
      const message = await this.i18n.translate(
        'article.at_least_one_field',
        { lang },
      );
      throw new BadRequestException(message);
    }

    const article = await this.findArticleBySlug(slug, undefined, lang);
    await this.checkArticleOwnership(article, currentUserId, lang);

    let newSlug = article.slug;
    if (title) {
      newSlug = slugify(title, { lower: true, strict: true });
      if (newSlug !== article.slug) {
        const existingArticle = await this.prisma.article.findUnique({
          where: { slug: newSlug },
        });

        if (existingArticle) {
          const message = await this.i18n.translate(
            'article.title_already_exists',
            { lang },
          );
          throw new BadRequestException(message);
        }
      }
    }

    const updatedArticle = await this.prisma.article.update({
      where: { slug },
      data: {
        slug: newSlug,
        title: title || article.title,
        description: description || article.description,
        body: body || article.body,
      },
      include: {
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
            id: true,
          },
        },
        favorites: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { id: true },
            }
          : false,
        _count: {
          select: { favorites: true },
        },
      },
    });

    const formattedArticle = await this.formatArticleResponse(
      updatedArticle,
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }

  async delete(
    slug: string,
    currentUserId: number,
    lang?: string,
  ): Promise<DeleteArticleResponse> {
    const article = await this.findArticleBySlug(slug, undefined, lang);
    await this.checkArticleOwnership(article, currentUserId, lang);

    await this.prisma.article.delete({
      where: { slug },
    });

    const message = await this.i18n.translate('article.deleted', {
      lang,
    });

    return {
      message,
    };
  }

  async findOne(
    slug: string,
    currentUserId?: number,
    lang?: string,
  ): Promise<ArticleResponse> {
    const article = await this.findArticleBySlug(slug, currentUserId, lang);
    const formattedArticle = await this.formatArticleResponse(
      article,
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }

  async findAll(
    queryDto: ListArticlesDto,
    currentUserId?: number,
    lang?: string,
  ): Promise<ListArticlesResponse> {
    const { tag, author, favorited } = queryDto;
    const limit = queryDto.limit ? Number(queryDto.limit) : 20;
    const offset = queryDto.offset ? Number(queryDto.offset) : 0;

    const whereClause: any = {};

    if (tag) {
      whereClause.tagList = {
        contains: `"${tag}"`,
      };
    }

    if (author) {
      whereClause.author = {
        username: author,
      };
    }

    if (favorited) {
      const favoritedUser = await this.prisma.user.findUnique({
        where: { username: favorited },
        select: { id: true },
      });

      if (!favoritedUser) {
        return { articles: [], articlesCount: 0 };
      }

      whereClause.favorites = {
        some: {
          userId: favoritedUser.id,
        },
      };
    }

    const [articles, totalCount] = await Promise.all([
      this.prisma.article.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
              id: true,
            },
          },
          favorites: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { id: true },
              }
            : false,
          _count: {
            select: { favorites: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.article.count({
        where: whereClause,
      }),
    ]);

    // Optimize
    const authorIds = articles.map((article) => article.author.id);
    const followingMap = await this.getFollowingMap(currentUserId, authorIds);

    const transformedArticles = articles.map((article) => {
      const tagList = this.parseTagList(article.tagList);
      const following = followingMap.get(article.author.id) || false;
      const favorited = Boolean(
        article.favorites && article.favorites.length > 0,
      );

      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        favorited,
        favoritesCount: article._count.favorites,
        author: {
          username: article.author.username,
          bio: article.author.bio || '',
          image: article.author.image || '',
          following,
        },
      };
    });

    return {
      articles: transformedArticles,
      articlesCount: totalCount,
    };
  }

  async favorite(
    slug: string,
    currentUserId: number,
    lang?: string,
  ): Promise<ArticleResponse> {
    const article = await this.findArticleBySlug(slug, undefined, lang);

    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: { userId: currentUserId, articleId: article.id },
      },
    });

    if (existingFavorite) {
      const message = await this.i18n.translate(
        'article.already_favorited',
        { lang },
      );
      throw new BadRequestException(message);
    }

    await this.prisma.favorite.create({
      data: {
        userId: currentUserId,
        articleId: article.id,
      },
    });

    await this.prisma.article.update({
      where: { id: article.id },
      data: { favoritesCount: { increment: 1 } },
    });

    // Refresh article data to get updated favorites count
    const updatedArticle = await this.findArticleBySlug(
      slug,
      currentUserId,
      lang,
    );
    const formattedArticle = await this.formatArticleResponse(
      updatedArticle,
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }

  async unfavorite(
    slug: string,
    currentUserId: number,
    lang?: string,
  ): Promise<ArticleResponse> {
    const article = await this.findArticleBySlug(slug, undefined, lang);

    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_articleId: { userId: currentUserId, articleId: article.id },
      },
    });

    if (!existingFavorite) {
      const message = await this.i18n.translate(
        'article.not_favorited',
        { lang },
      );
      throw new BadRequestException(message);
    }

    await this.prisma.favorite.delete({
      where: { id: existingFavorite.id },
    });

    await this.prisma.article.update({
      where: { id: article.id },
      data: { favoritesCount: { decrement: 1 } },
    });

    // Refresh article data to get updated favorites count
    const updatedArticle = await this.findArticleBySlug(
      slug,
      currentUserId,
      lang,
    );
    const formattedArticle = await this.formatArticleResponse(
      updatedArticle,
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }
}
