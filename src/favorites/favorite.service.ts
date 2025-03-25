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
    
    async getFavoriteLocations(customerId: number) {
      try {
        const locations = await this.model.$queryRaw<
          { LOCATION_ID: number; LOCATION_NAME: string; ADDRESS: string; COORDINATES: string }[]
        >`
          SELECT LOCATION_ID, LOCATION_NAME, ADDRESS, ST_AsText(COORDINATES) AS COORDINATES
          FROM FAVORITE_LOCATION
          WHERE CUSTOMER_ID = ${customerId}
        `;
    
        // Chuyển đổi dữ liệu tọa độ và thêm ID vào kết quả trả về
        const formattedLocations = locations.map((loc) => {
          const match = loc.COORDINATES.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          return {
            id: loc.LOCATION_ID, // ✅ Đúng cột ID
            location_name: loc.LOCATION_NAME,
            address: loc.ADDRESS,
            coordinates: match ? { lat: parseFloat(match[2]), lng: parseFloat(match[1]) } : null,
          };
        });
    
        return formattedLocations;
      } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách địa điểm yêu thích:", error);
        throw new HttpException(error.message || "Lỗi máy chủ!", HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
    
    

    async removeFavoriteLocation(customer_id: string, locationId: number) {
      try {
        const customerIdNumber = Number(customer_id);
        
        // Kiểm tra xem địa điểm có tồn tại không
        const favorite = await this.model.fAVORITE_LOCATION.findFirst({
          where: {
            CUSTOMER_ID: customerIdNumber,
            LOCATION_ID: locationId,
          },
        });
    
        if (!favorite) {
          throw new HttpException('Địa điểm yêu thích không tồn tại', HttpStatus.NOT_FOUND);
        }
    
        // Xóa địa điểm yêu thích
        await this.model.fAVORITE_LOCATION.deleteMany({
          where: {
            CUSTOMER_ID: customerIdNumber,
            LOCATION_ID: locationId,
          },
        });
    
        return { message: 'Đã xóa địa điểm yêu thích thành công', statusCode: HttpStatus.OK };
      } catch (error) {
        console.error('❌ Lỗi khi xóa địa điểm yêu thích:', error);
        throw new HttpException(
          error.response?.message || error.message || 'Lỗi máy chủ khi xóa địa điểm yêu thích',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    
    
    

}