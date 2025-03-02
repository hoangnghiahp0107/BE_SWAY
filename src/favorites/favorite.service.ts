import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { FavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoriteService{
    constructor(
        private configService: ConfigService
    ) {}

    model = new PrismaClient();


    async addFavoriteLocation(addFavoriteLocation: FavoriteDto, customer_id: number) {
      const { location_name, address, coordinates } = addFavoriteLocation;
    
      try {
        // Kiểm tra các trường bắt buộc
        if (!location_name || !address || !coordinates) {
          throw new HttpException(
            'Thiếu các trường bắt buộc: location_name, address hoặc coordinates.',
            HttpStatus.BAD_REQUEST
          );
        }
    
        // Kiểm tra định dạng của coordinates
        if (typeof coordinates !== 'object' || !coordinates.lat || !coordinates.lng) {
          throw new HttpException(
            'Định dạng coordinates không hợp lệ. Cần có lat và lng.',
            HttpStatus.BAD_REQUEST
          );
        }
    
        // Kiểm tra xem vị trí yêu thích đã tồn tại hay chưa
        const existingLocation = await this.model.fAVORITE_LOCATION.findFirst({
          where: {
            CUSTOMER_ID: customer_id,
            LOCATION_NAME: location_name,
            ADDRESS: address,
          },
        });
    
        if (existingLocation) {
          throw new HttpException(
            'Vị trí yêu thích này đã tồn tại cho khách hàng này.',
            HttpStatus.CONFLICT
          );
        }
    
        // Tạo chuỗi POINT
        const point = `POINT(${coordinates.lng} ${coordinates.lat})`;
    
        // Thực thi câu lệnh SQL raw để thêm vị trí yêu thích
        const newFavoriteLocation = await this.model.$queryRaw`INSERT INTO FAVORITE_LOCATION (CUSTOMER_ID, LOCATION_NAME, ADDRESS, COORDINATES) VALUES (${customer_id}, ${location_name}, ${address}, ST_GeomFromText(${point}))`;
    
        // Trả về thông báo thành công
        return { message: 'Vị trí yêu thích đã được thêm thành công', statusCode: HttpStatus.OK, data: {newFavoriteLocation}};
      } catch (error) {
        console.error('Lỗi khi thêm vị trí yêu thích:', error);
        throw new HttpException(error.response.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    
}