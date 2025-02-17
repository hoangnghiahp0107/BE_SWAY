import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger/dist';

import { ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SignUpCustomer, LoginCustomer, verifyOtp, resendOtp, updateCustomer } from './entities/user.entity';
import { UserService } from './user.service';
import { LoginDto } from './dto/login-user.dto';
import { ResendOtpDto, SignUpDto, VerifyOtpDto } from './dto/create-user.dto';

@ApiTags("User Management")
@Controller('/api/UserManagement')
export class UserController{
    constructor(private readonly userService: UserService) {}
    @HttpCode(200)
    @ApiBody({
        type: LoginCustomer,
    })
    @Post('/Login')
    login(@Body() body: LoginDto) {
      return this.userService.login(body);
    }
    
    @HttpCode(200)
    @ApiBody({
      type: SignUpCustomer,
    })

    @Post('/SignUp')
    signUp(@Body() body: SignUpDto) {
      return this.userService.signUp(body);
    }

    @HttpCode(200)
    @ApiBody({
      type: verifyOtp,
    })

    @Post('/verifyOtp')
    async verifyOtp(@Body() body: VerifyOtpDto) {
        const { email, otp_code } = body;

        try {
            const result = await this.userService.verifyOtp(email, otp_code);

            return {
                message: result.message,
                statusCode: result.statusCode,
            };
        } catch (error) {
            throw new HttpException(error.message, error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @HttpCode(200)
    @ApiBody({
      type: resendOtp,
    })
  
    @Post('/resendOtp')
    async resendOtp(@Body() body: ResendOtpDto) {
        const { email } = body;
    
        try {
            const result = await this.userService.resendOtp(email);
    
            return {
                message: result.message,
                statusCode: result.statusCode,
            };
        } catch (error) {
            throw new HttpException(error.message, error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiBody({
      type: updateCustomer,
    })
    @Put("/update-personal-info")
    async updateCustomer(@Body() body: SignUpDto, @Request() req) {
      if (body.email !== req.user.data.EMAIL) {
        throw new HttpException('Bạn chỉ có thể cập nhật thông tin của chính mình', HttpStatus.FORBIDDEN);
      }
      
      return this.userService.updateCustomer(body);
    }
    
}