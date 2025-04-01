import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger/dist';
import { AuthGuard } from '@nestjs/passport';
import { FavoriteLocation } from './entities/favorite.entity';
import { FavoriteDto } from './dto/create-favorite.dto';
import { FavoriteService } from './favorite.service';

@ApiTags("Favorite Management")
@Controller('/api/FavoriteManagement')

export class FavoriteController{
    constructor(private readonly favoriteService: FavoriteService) {}
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiBody({
        type: FavoriteLocation,
    })
    @Post('/add-favorite-location')
    async addFavoriteLocation(@Body() body: FavoriteDto, @Request() req: any) {
        console.log("📥 Dữ liệu nhận từ Flutter:", body);
    
        const customer_id = req.user?.data?.CUSTOMER_ID;
        if (!customer_id) {
            throw new HttpException('Customer ID not found in token.', HttpStatus.UNAUTHORIZED);
        }
    
        try {
            const result = await this.favoriteService.addFavoriteLocation(body, customer_id);
            return {
                message: 'Vị trí yêu thích đã được lưu!',
                data: result,
                statusCode: HttpStatus.OK
            };
        } catch (error) {
            console.error("❌ Lỗi khi lưu địa điểm yêu thích:", error);
            throw new HttpException(error.message || 'Lỗi máy chủ!', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @Get('/get-favorite-locations')
    async getFavoriteLocations(@Request() req: any) {
      console.log("📥 Nhận yêu cầu lấy danh sách địa điểm yêu thích");
  
      const customer_id = req.user?.data?.CUSTOMER_ID;
      if (!customer_id) {
        throw new HttpException('Customer ID not found in token.', HttpStatus.UNAUTHORIZED);
      }
  
      try {
        const locations = await this.favoriteService.getFavoriteLocations(customer_id);
        return {
          message: 'Lấy danh sách địa điểm yêu thích thành công!',
          data: locations,
          statusCode: HttpStatus.OK
        };
      } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách địa điểm yêu thích:", error);
        throw new HttpException(error.message || 'Lỗi máy chủ!', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @Delete('remove-favorite-location')
  async removeFavoriteLocation(
    @Query('customer_id') customerId: string,
    @Query('location_id') locationId: string,
  ) {
    if (!customerId || !locationId) {
      throw new HttpException('Thiếu customer_id hoặc location_id', HttpStatus.BAD_REQUEST);
    }

    const locationIdNumber = Number(locationId);
    if (isNaN(locationIdNumber)) {
      throw new HttpException('location_id không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    return this.favoriteService.removeFavoriteLocation(customerId, locationIdNumber);
  }
}