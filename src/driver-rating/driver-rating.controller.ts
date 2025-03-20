import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  UseGuards,
  HttpException,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DriverRatingService } from '../driver-rating/driver-rating.service';
import { CreateDriverRatingDto } from '../driver-rating/dto/driver-rating.dto';

@ApiTags('Driver Rating Management')
@Controller('/api/DriverRating')
export class DriverRatingController {
  constructor(private readonly driverRatingService: DriverRatingService) {}

  // ✅ Thêm đánh giá tài xế
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @ApiBody({ type: CreateDriverRatingDto })
  @Post('/rate-driver')
  async createRating(@Request() req, @Body() body: CreateDriverRatingDto) {
    try {
      const customer_id = req.user.data.CUSTOMER_ID;
      if (customer_id !== body.customer_id) {
        throw new HttpException(
          'Bạn chỉ có thể đánh giá với tài khoản của chính mình',
          HttpStatus.FORBIDDEN,
        );
      }
      return await this.driverRatingService.createDriverRating(body);
    } catch (error) {
      throw new HttpException(
        error.message,
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Lấy danh sách đánh giá của tài xế
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @ApiQuery({ name: 'driver_id', required: true, type: Number })
  @Get('/get-driver-ratings')
  async getRatingsByDriver(@Query('driver_id') driver_id: number) {
    try {
      return await this.driverRatingService.getRatingsByDriver(driver_id);
    } catch (error) {
      throw new HttpException(
        error.message,
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ Lấy điểm trung bình của tài xế
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  @ApiQuery({ name: 'driver_id', required: true, type: Number })
  @Get('/get-driver-average-rating')
  async getDriverAverageRating(@Query('driver_id') driver_id: number) {
    try {
      return await this.driverRatingService.getDriverAverageRating(driver_id);
    } catch (error) {
      throw new HttpException(
        error.message,
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
