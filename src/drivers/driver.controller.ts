import { DriverService } from "./driver.service";
import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger/dist';
import { checkEmailAndPhoneDriver, LoginDriver, resendOtpDriver, SignUpDriver, updateDriver, verifyOtpDriver } from "./entities/drive.entity";
import { LoginDriverDto } from "./dto/login-driver.dto";
import { ResendDriverOtpDto, SignUpDriverDto, VerifyDriverOtpDto } from "./dto/create-driver.dto";
import { AuthGuard } from "@nestjs/passport";

@ApiTags("Driver Management")
@Controller("/api/DriverManagement")
export class DriverController{
    constructor(private readonly driverService: DriverService){}
    @HttpCode(200)
    @ApiBody({
        type: LoginDriver,
    })
    @Post('/Login')
    loginDriver(@Body() body: LoginDriverDto) {
      return this.driverService.loginDriver(body);
    }
    
    @HttpCode(200)
    @ApiBody({
      type: SignUpDriver,
    })

    @Post('/SignUp')
    signUpDriver(@Body() body: SignUpDriverDto) {
      return this.driverService.signUpDriver(body);
    }

    @HttpCode(200)
    @ApiBody({
      type: checkEmailAndPhoneDriver
    })
    @Post('/checkEmailAndPhoneExistence')
    checkEmailAndPhoneExistence(@Body() body: { email: string, phone: string }) {
      const { email, phone } = body;
      return this.driverService.checkEmailAndPhoneExistence(email, phone);
    }

    @HttpCode(200)
    @ApiBody({
      type: verifyOtpDriver,
    })

    @Post('/verifyOtp')
    async verifyOtp(@Body() body: VerifyDriverOtpDto) {
        const { email, otp_code } = body;

        try {
            const result = await this.driverService.verifyOtp(email, otp_code);

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
      type: resendOtpDriver,
    })
  
    @Post('/resendOtp')
    async resendOtp(@Body() body: ResendDriverOtpDto) {
        const { email } = body;
    
        try {
            const result = await this.driverService.resendOtp(email);
    
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
    @ApiQuery({ name: 'driver_id', required: true })
    @ApiBody({
        type: updateDriver,
    })
    @Put("/update-personal-info")
    async updateDriver(@Body() body: SignUpDriverDto, @Request() req) {
        const driver_id = req.user.data.DRIVER_ID;
        const requestedDriverID = parseInt(req.query.driver_id);
    
        if (isNaN(requestedDriverID)) {
            throw new HttpException('Invalid driver ID', HttpStatus.BAD_REQUEST);
        }
    
        if (driver_id !== requestedDriverID) {
            throw new HttpException('Bạn chỉ có thể cập nhật thông tin của chính mình', HttpStatus.FORBIDDEN);
        }
    
        return this.driverService.updateDriverInfo({ ...body, driver_id }); 
    }
    

    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiQuery({ name: 'driver_id', required: true })
    @Get("/get-infomation-driver")
    async getInfoDriver(@Request() req) {
        const driver_id  = req.user.data.DRIVER_ID;
        const requestedDriverID = parseInt(req.query.driver_id);
        if (driver_id !== requestedDriverID) {
            throw new HttpException('Bạn chỉ có thể xem thông tin của chính mình', HttpStatus.FORBIDDEN);
        }
    
        return this.driverService.getInfoDriver(driver_id);
    }  
}