import { ApiProperty } from "@nestjs/swagger";

export class FavoriteLocation {
    @ApiProperty()
    location_name: string;

    @ApiProperty()
    address: string;

    @ApiProperty()
    coordinates: { lat: number; lng: number }; // Sửa lại kiểu tọa độ
}
