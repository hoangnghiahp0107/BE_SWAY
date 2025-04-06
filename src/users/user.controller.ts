import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger/dist';

import { ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SignUpCustomer, LoginCustomer, verifyOtp, resendOtp, updateCustomer, checkEmailAndPhone, findLocation, bookingDriver } from './entities/user.entity';
import { UserService } from './user.service';
import { LoginDto } from './dto/login-user.dto';
import { ResendOtpDto, SignUpDto, VerifyOtpDto } from './dto/create-user.dto';
import { BookingDriver, UpdateBooking } from './dto/booking.dto';

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
      type: checkEmailAndPhone
    })
    @Post('/checkEmailAndPhoneExistence')
    checkEmailAndPhoneExistence(@Body() body: { email: string, phone: string }) {
      const { email, phone } = body;
      return this.userService.checkEmailAndPhoneExistence(email, phone);
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
    @ApiQuery({ name: 'customer_id', required: true })
    @ApiBody({
      type: updateCustomer,
    })
    @Put("/update-personal-info")
async updateCustomer(@Body() body: SignUpDto, @Request() req) {
    console.log("DEBUG: Token CUSTOMER_ID =", req.user.data.CUSTOMER_ID);
    console.log("DEBUG: Query CUSTOMER_ID =", req.query.customer_id);
    console.log("DEBUG: Body nhận được =", body);  // 🟢 Log dữ liệu nhận được

    const customer_id = req.user.data.CUSTOMER_ID;
    const requestedCustomerID = parseInt(req.query.customer_id);

    if (isNaN(requestedCustomerID)) {
        throw new HttpException('Invalid customer ID', HttpStatus.BAD_REQUEST);
    }
    if (customer_id !== requestedCustomerID) {
        throw new HttpException('Bạn chỉ có thể cập nhật thông tin của chính mình', HttpStatus.FORBIDDEN);
    }

    const result = await this.userService.updateCustomer({...body, customer_id});
    console.log("DEBUG: Kết quả update =", result); // 🟢 Kiểm tra kết quả update
    return result;
}

  
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiQuery({ name: 'customer_id', required: true })
    @Get("/get-information-customer")
    async getInfoCustomer(@Request() req) { 
        const customer_id  = req.user.data.CUSTOMER_ID;
        const requestedCustomerId = parseInt(req.query.customer_id);
    
        if (customer_id !== requestedCustomerId) {
            throw new HttpException('Bạn chỉ có thể xem thông tin của chính mình', HttpStatus.FORBIDDEN);
        }
    
        return this.userService.getInfoCustomer(customer_id);
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiQuery({ name: 'customer_id', required: true }) // customer_id là String
    @ApiBody({
      schema: {
        type: "object",
        properties: {
          oldPassword: { type: "string" },
          newPassword: { type: "string" },
          confirmPassword: { type: "string" }
        },
        required: ["oldPassword", "newPassword", "confirmPassword"]
      }
    })
    @Put("/change-password")
    async changePassword(@Body() body: any, @Request() req) {
        console.log("DEBUG: Token CUSTOMER_ID =", req.user.data.CUSTOMER_ID);
        console.log("DEBUG: Query CUSTOMER_ID =", req.query.customer_id);
        console.log("DEBUG: Body nhận được =", body);
    
        const customer_id = req.user.data.CUSTOMER_ID; // ✅ Giữ nguyên kiểu String
        const requestedCustomerID = req.query.customer_id; // ✅ Không ép kiểu thành số
    
        if (!requestedCustomerID) {
            throw new HttpException('Invalid customer ID', HttpStatus.BAD_REQUEST);
        }
        
        if (Number(customer_id) !== Number(requestedCustomerID)) {
            throw new HttpException('Bạn chỉ có thể thay đổi mật khẩu của chính mình', HttpStatus.FORBIDDEN);
        }
        
    
        const { oldPassword, newPassword, confirmPassword } = body;
    
        if (!oldPassword || !newPassword || !confirmPassword) {
            throw new HttpException('Vui lòng nhập đầy đủ thông tin', HttpStatus.BAD_REQUEST);
        }
    
        if (newPassword !== confirmPassword) {
            throw new HttpException('Mật khẩu mới và xác nhận không khớp', HttpStatus.BAD_REQUEST);
        }
    
        const result = await this.userService.changePassword(customer_id, oldPassword, newPassword);
        console.log("DEBUG: Kết quả đổi mật khẩu =", result);
        return result;
    }
    
    
    // @ApiBearerAuth()
    // @UseGuards(AuthGuard("jwt"))
    // @HttpCode(200)
    // @ApiQuery({ name: 'customer_id', required: true, type: Number })
    // @ApiQuery({ name: 'vehicle_type_id', required: true, type: Number })
    // @Get("/find-driver")
    // async findDriver(
    //     @Request() req 
    // ) {
    //     try {
    //         const customer_id = req.user.data.CUSTOMER_ID;
    //         const requestedCustomerId = parseInt(req.query.customer_id);
    //         const vehicle_type_id = parseInt(req.query.vehicle_type_id);

    //         if (customer_id !== requestedCustomerId) {
    //             throw new HttpException('Bạn chỉ có thể xem thông tin của chính mình', HttpStatus.FORBIDDEN);
    //         }
    
    //         return await this.userService.findDriver(customer_id, vehicle_type_id);
    //     } catch (error) {
    //         throw new HttpException(
    //             error.response?.message || 'Lỗi hệ thống',
    //             error.status || HttpStatus.INTERNAL_SERVER_ERROR
    //         );
    //     }
    // }



    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @Post('/booking-driver')
    @ApiBody({ type: bookingDriver })
    async bookingDriver(@Request() req, @Body() body: BookingDriver) {
        try {
            // Lấy customer_id từ thông tin người dùng đã xác thực trong token
            const customer_id = req.user.data.CUSTOMER_ID;
            
            // Gọi service để thực hiện đặt xe
            return await this.userService.bookingDriver(customer_id, body);
        } catch (error) {
            console.error('Lỗi khi đặt xe:', error);
            throw new HttpException(
                error.message || 'Lỗi hệ thống',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }  

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @Put('/update-booking-driver')
    async updateBookingDriver(@Request() req, @Body() body: { customer_id: number }) {
        try {
            // Get the customer_id from the authenticated user
            const customer_id = req.user.data.CUSTOMER_ID;
    
            // Call the service method to update the booking driver using the customer_id
            const result = await this.userService.updateBookingDriver(customer_id);
            return result;
        } catch (error) {
            console.error('Error while updating the trip:', error);
            throw new HttpException(
                error.message || 'An error occurred while updating the trip.',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    
}