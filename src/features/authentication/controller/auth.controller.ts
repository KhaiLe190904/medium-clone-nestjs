import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "@/features/authentication/service/auth.service";
import { UserLoginDto } from "@/features/authentication/dto/userLogin.dto";
import { UserDto } from "@/features/authentication/dto/user.dto";

@Controller('api')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('users')
    async register(@Body('user') createUserDto: UserDto) {
        const user = await this.authService.register(createUserDto);
        return user;
    }

    @Post('users/login')
    async login(@Body('user') loginUserDto: UserLoginDto) {
        const user = await this.authService.validateUser(loginUserDto);
        return user;
    }
}