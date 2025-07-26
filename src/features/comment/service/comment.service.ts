import { CreateCommentDto } from '@/features/comment/dto/create-comment.dto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

export interface CommentResponse {
  comment: {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    body: string;
    author: {
      id: number;
      username: string;
      bio: string | null;
      image: string | null;
      following: boolean;
    };
  };
}

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private async validateArticleSlug(slug: string, lang?: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: true,
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

  async createComment(
    slug: string,
    createCommentDto: CreateCommentDto,
    currentUserId: number,
    lang?: string,
  ): Promise<CommentResponse> {
    const article = await this.validateArticleSlug(slug, lang);

    const comment = await this.prisma.comment.create({
      data: {
        body: createCommentDto.body,
        userId: currentUserId,
        articleId: article.id,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        body: true,
        user: {
          select: {
            id: true,
            username: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    return {
      comment: {
        id: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        body: comment.body,
        author: {
          id: comment.user.id,
          username: comment.user.username,
          bio: comment.user.bio,
          image: comment.user.image,
          following: false, // USER CANNOT FOLLOW THEMSELVES
        },
      },
    };
  }

  private async getFollowingMap(
    currentUserId: number,
    targetUserIds: number[],
  ): Promise<Map<number, boolean>> {
    const followRelations = await this.prisma.follow.findMany({
      where: { followerId: currentUserId, followingId: { in: targetUserIds } },
    });
    return new Map(followRelations.map((follow) => [follow.followingId, true]));
  }

  async getCommentsFromArticle(
    slug: string,
    currentUserId: number | null,
    lang?: string,
  ): Promise<CommentResponse[]> {
    const article = await this.validateArticleSlug(slug, lang);

    const comments = await this.prisma.comment.findMany({
      where: { articleId: article.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        body: true,
        user: {
          select: {
            id: true,
            username: true,
            bio: true,
            image: true,
          },
        },
      },
    });

    // If user is not logged in, all following should be false
    if (!currentUserId) {
      return comments.map((comment) => ({
        comment: {
          id: comment.id,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          body: comment.body,
          author: {
            id: comment.user.id,
            username: comment.user.username,
            bio: comment.user.bio,
            image: comment.user.image,
            following: false,
          },
        },
      }));
    }

    const followingMap = await this.getFollowingMap(
      currentUserId,
      comments.map((comment) => comment.user.id),
    );

    return comments.map((comment) => ({
      comment: {
        id: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        body: comment.body,
        author: {
          id: comment.user.id,
          username: comment.user.username,
          bio: comment.user.bio,
          image: comment.user.image,
          following:
            comment.user.id === currentUserId
              ? false
              : followingMap.get(comment.user.id) || false,
        },
      },
    }));
  }

  async deleteComment(
    slug: string,
    id: string,
    currentUserId: number,
    lang?: string,
  ): Promise<{ message: string }> {
    const article = await this.validateArticleSlug(slug, lang);

    const comment = await this.prisma.comment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!comment) {
      const message = await this.i18n.translate('comment.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    if (comment.userId !== currentUserId) {
      const message = await this.i18n.translate(
        'comment.delete_forbidden',
        { lang },
      );
      throw new ForbiddenException(message);
    }

    await this.prisma.comment.delete({ where: { id: parseInt(id) } });

    const successMessage = await this.i18n.translate(
      'comment.deleted',
      { lang },
    );

    return {
      message: successMessage,
    };
  }
}
