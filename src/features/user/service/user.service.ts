import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ProfileDto } from '@/features/user/dto/profile.dto';
import { UpdateUserDto } from '@/features/user/dto/updateUser.dto';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async getCurrentUser(userId: number, lang?: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const message = await this.i18n.translate('user.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    return user;
  }

  async updateUser(
    userId: number,
    updateUserDto: UpdateUserDto,
    lang?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      const message = await this.i18n.translate('user.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: updateUserDto.email,
        },
      });

      if (existingUser) {
        const message = await this.i18n.translate(
          'user.email_already_in_use',
          { lang },
        );
        throw new BadRequestException(message);
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          username: updateUserDto.username,
        },
      });

      if (existingUser) {
        const message = await this.i18n.translate(
          'user.username_already_taken',
          { lang },
        );
        throw new BadRequestException(message);
      }
    }

    if (updateUserDto.password && !updateUserDto.confirmPassword) {
      const message = await this.i18n.translate(
        'validation.password_confirmation_required',
        { lang },
      );
      throw new BadRequestException(message);
    }

    if (updateUserDto.password && updateUserDto.confirmPassword) {
      if (updateUserDto.password !== updateUserDto.confirmPassword) {
        const message = await this.i18n.translate(
          'validation.password_mismatch',
          { lang },
        );
        throw new BadRequestException(message);
      }
    }

    const updateData: any = { ...updateUserDto };
    delete updateData.confirmPassword;

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async getProfile(
    username: string,
    currentUserId?: number,
    lang?: string,
  ): Promise<ProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        bio: true,
        image: true,
        id: true,
      },
    });

    if (!user) {
      const message = await this.i18n.translate('user.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    let following = false;
    if (currentUserId) {
      const followRecord = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      following = !!followRecord;
    }

    return {
      username: user.username,
      bio: user.bio,
      image: user.image,
      following,
    };
  }

  async followUser(
    username: string,
    currentUserId: number,
    lang?: string,
  ): Promise<ProfileDto> {
    const userToFollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!userToFollow) {
      const message = await this.i18n.translate('user.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    if (userToFollow.id === currentUserId) {
      const message = await this.i18n.translate(
        'user.cannot_follow_yourself',
        { lang },
      );
      throw new BadRequestException(message);
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userToFollow.id,
        },
      },
    });

    if (existingFollow) {
      const message = await this.i18n.translate(
        'user.already_following',
        { lang },
      );
      throw new BadRequestException(message);
    }

    await this.prisma.follow.create({
      data: {
        followerId: currentUserId,
        followingId: userToFollow.id,
      },
    });

    return {
      username: userToFollow.username,
      bio: userToFollow.bio,
      image: userToFollow.image,
      following: true,
    };
  }

  async unfollowUser(
    username: string,
    currentUserId: number,
    lang?: string,
  ): Promise<ProfileDto> {
    const userToUnfollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!userToUnfollow) {
      const message = await this.i18n.translate('user.not_found', {
        lang,
      });
      throw new NotFoundException(message);
    }

    await this.prisma.follow.deleteMany({
      where: {
        followerId: currentUserId,
        followingId: userToUnfollow.id,
      },
    });

    return {
      username: userToUnfollow.username,
      bio: userToUnfollow.bio,
      image: userToUnfollow.image,
      following: false,
    };
  }
}
