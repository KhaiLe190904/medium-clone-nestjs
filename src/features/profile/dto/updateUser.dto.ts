import { IsEmail, IsString, IsOptional, IsUrl, MinLength } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsString()
    bio?: string;
}
