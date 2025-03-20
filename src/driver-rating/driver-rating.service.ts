import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateDriverRatingDto } from '../driver-rating/dto/driver-rating.dto';

@Injectable()
export class DriverRatingService {
  private prisma = new PrismaClient();

  // them danh gia tai xe
  async createDriverRating(createRatingDto: CreateDriverRatingDto) {
    const { customer_id, driver_id, trip_id, rating, review } = createRatingDto;

    // Kiểm tra xem chuyến đi có tồn tại không
    const trip = await this.prisma.tRIP_HISTORY.findFirst({
      where: { TRIP_ID: trip_id },
      select: { STATUS: true },
    });

    if (!trip) {
      throw new HttpException('Chuyến đi không tồn tại', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra xem chuyến đi đã hoàn thành chưa
    if (trip.STATUS !== 'COMPLETED') {
      throw new HttpException(
        'Chỉ có thể đánh giá chuyến đi đã hoàn thành',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Kiểm tra xem đã đánh giá trước đó chưa
    const existingRating = await this.prisma.dRIVER_RATING.findFirst({
      where: { TRIP_ID: trip_id },
    });

    if (existingRating) {
      throw new HttpException(
        'Chuyến đi này đã được đánh giá trước đó',
        HttpStatus.CONFLICT,
      );
    }

    // Thêm đánh giá vào database
    const newRating = await this.prisma.dRIVER_RATING.create({
      data: {
        CUSTOMER_ID: customer_id,
        DRIVER_ID: driver_id,
        TRIP_ID: trip_id,
        RATING: rating,
        REVIEW: review || null,
      },
    });

    return {
      message: 'Đánh giá tài xế thành công',
      statusCode: HttpStatus.CREATED,
      data: newRating,
    };
  }

  // Lay danh sach danh gia cua tai xe
  async getRatingsByDriver(driver_id: number) {
    const ratings = await this.prisma.dRIVER_RATING.findMany({
      where: {
        DRIVER_ID: parseInt(driver_id.toString()), // Chuyển driver_id thành số nguyên
      },
      select: {
        RATING_ID: true,
        CUSTOMER_ID: true,
        TRIP_ID: true,
        RATING: true,
        REVIEW: true,
        RATED_AT: true,
      },
    });

    if (ratings.length === 0) {
      throw new HttpException(
        'Tài xế chưa có đánh giá nào',
        HttpStatus.NOT_FOUND,
      );
    }

    return ratings;
  }

  // Tinh diem trung binh tai xe
  async getDriverAverageRating(driver_id: number) {
    const ratings = await this.prisma.dRIVER_RATING.findMany({
      where: {
        DRIVER_ID: parseInt(driver_id.toString()), // Chuyển driver_id thành số nguyên
      },
      select: { RATING: true },
    });

    if (ratings.length === 0) {
      return {
        message: 'Tài xế chưa có đánh giá',
        averageRating: 0,
      };
    }

    const total = ratings.reduce(
      (sum, rating) => sum + (rating.RATING as unknown as number),
      0,
    );
    const averageRating = Number((total / ratings.length).toFixed(1));

    return {
      message: 'Điểm trung bình của tài xế',
      averageRating,
    };
  }
}
