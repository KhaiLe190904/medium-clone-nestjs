import {
  BadRequestException,
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

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) {}

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

    let tagList: string[] = [];
    try {
      tagList = JSON.parse(article.tagList);
    } catch {
      tagList = [];
    }

    let following = false;
    if (currentUserId && currentUserId !== article.author.id) {
      const followRelation = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: article.author.id,
          },
        },
      });
      following = !!followRelation;
    }

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

    let parsedTagList: string[] = [];
    try {
      parsedTagList = JSON.parse(newArticle.tagList);
    } catch {
      parsedTagList = [];
    }

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

    const transformedArticles = await Promise.all(
      articles.map(async (article) => {
        let tagList: string[] = [];
        try {
          tagList = JSON.parse(article.tagList);
        } catch {
          tagList = [];
        }

        let following = false;
        if (currentUserId && currentUserId !== article.author.id) {
          const followRelation = await this.prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: article.author.id,
              },
            },
          });
          following = !!followRelation;
        }

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
      }),
    );

    return {
      articles: transformedArticles,
      articlesCount: totalCount,
    };
  }
}
