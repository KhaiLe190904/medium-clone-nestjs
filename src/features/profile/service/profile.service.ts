import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ProfileDto } from '@/features/profile/dto/profile.dto';
import { UpdateUserDto } from '@/features/profile/dto/updateUser.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: number) {
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
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken by another user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: updateUserDto.email,
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Check if username is being updated and if it's already taken by another user
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          username: updateUserDto.username,
        },
      });

      if (existingUser) {
        throw new BadRequestException('Username already taken');
      }
    }

    const updateData: any = { ...updateUserDto };

    // Hash password if it's being updated
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
      throw new NotFoundException('User not found');
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
  ): Promise<ProfileDto> {
    const userToFollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!userToFollow) {
      throw new NotFoundException('User not found');
    }

    if (userToFollow.id === currentUserId) {
      throw new NotFoundException('Cannot follow yourself');
    }

    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: userToFollow.id,
        },
      },
      update: {},
      create: {
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
  ): Promise<ProfileDto> {
    const userToUnfollow = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, bio: true, image: true },
    });

    if (!userToUnfollow) {
      throw new NotFoundException('User not found');
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
