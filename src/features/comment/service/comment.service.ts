import { CreateCommentDto } from '@/features/comment/dto/create-comment.dto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
  constructor(private readonly prisma: PrismaService) {}

  private async validateArticleSlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  async createComment(
    slug: string,
    createCommentDto: CreateCommentDto,
    currentUserId: number,
  ): Promise<CommentResponse> {
    const article = await this.validateArticleSlug(slug);

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
  ): Promise<CommentResponse[]> {
    const article = await this.validateArticleSlug(slug);

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
  ): Promise<{ message: string }> {
    const article = await this.validateArticleSlug(slug);

    const comment = await this.prisma.comment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== currentUserId) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    await this.prisma.comment.delete({ where: { id: parseInt(id) } });

    return {
      message: 'Comment deleted successfully',
    };
  }
}
