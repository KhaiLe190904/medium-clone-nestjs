import { CommentService } from '@/features/comment/service/comment.service';
import { Body, Controller, Delete, Get, Param, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/features/authentication/guard/jwt.guard';
import { CreateCommentDto } from '@/features/comment/dto/create-comment.dto';
import { OptionalJwtAuthGuard } from '@/features/authentication/guard/optional-jwt.guard';

@Controller('api/articles/:slug/comments')
export class CommentController {

  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Param('slug') slug: string, @Body('comment') createCommentDto: CreateCommentDto, @Request() req: any){
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.commentService.createComment(slug, createCommentDto, currentUserId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getCommentsFromArticle(@Param('slug') slug: string, @Request() req: any){
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.commentService.getCommentsFromArticle(slug, currentUserId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('slug') slug: string, @Param('id') id: string, @Request() req: any){
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new UnauthorizedException('User authentication required');
    }
    return this.commentService.deleteComment(slug, id, currentUserId);  
  }
}
