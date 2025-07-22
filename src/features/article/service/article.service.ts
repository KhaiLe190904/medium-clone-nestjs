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

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(createArticleDto: CreateArticleDto, currentUserId: number) {
    const { title, description, body, tagList } = createArticleDto;

    const slug = slugify(title, { lower: true, strict: true });

    const existingArticle = await this.prisma.article.findUnique({
      where: { slug },
    });

    if (existingArticle) {
      throw new BadRequestException('Article with this title already exists');
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
  ) {
    const { title, description, body } = updateArticleDto;

    if (!title && !description && !body) {
      throw new BadRequestException('At least one field must be provided');
    }

    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('You are not the author of this article');
    }

    let newSlug = article.slug;
    if (title) {
      newSlug = slugify(title, { lower: true, strict: true });
      if (newSlug !== article.slug) {
        const existingArticle = await this.prisma.article.findUnique({
          where: { slug: newSlug },
        });

        if (existingArticle) {
          throw new BadRequestException(
            'Article with this title already exists',
          );
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

    const tagList = this.parseTagList(updatedArticle.tagList);
    const following = await this.checkFollowing(
      currentUserId,
      updatedArticle.author.id,
    );
    const favorited =
      updatedArticle.favorites && updatedArticle.favorites.length > 0;

    return {
      article: {
        slug: updatedArticle.slug,
        title: updatedArticle.title,
        description: updatedArticle.description,
        body: updatedArticle.body,
        tagList,
        createdAt: updatedArticle.createdAt.toISOString(),
        updatedAt: updatedArticle.updatedAt.toISOString(),
        favorited,
        favoritesCount: updatedArticle._count.favorites,
        author: {
          username: updatedArticle.author.username,
          bio: updatedArticle.author.bio || '',
          image: updatedArticle.author.image || '',
          following,
        },
      },
    };
  }

  async delete(slug: string, currentUserId: number) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('You are not the author of this article');
    }

    await this.prisma.article.delete({
      where: { slug },
    });

    return {
      message: 'Article deleted successfully',
    };
  }

  async findOne(slug: string, currentUserId?: number) {
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
      throw new NotFoundException('Article not found');
    }

    const tagList = this.parseTagList(article.tagList);
    const following = await this.checkFollowing(
      currentUserId,
      article.author.id,
    );

    const favorited = article.favorites && article.favorites.length > 0;

    return {
      article: {
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
      },
    };
  }

  async findAll(
    queryDto: ListArticlesDto,
    currentUserId?: number,
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
      const favorited = article.favorites && article.favorites.length > 0;

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
}
