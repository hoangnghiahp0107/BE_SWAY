import { ApiProperty } from "@nestjs/swagger";

export class TripHistory{
    @ApiProperty()
    customer_id: number;
    @ApiProperty()
    driver_id: number;
    @ApiProperty()
    vehicle_id: number;
    @ApiProperty()
    route_id: number;
    @ApiProperty({type: String})
    start_time: Date;
    @ApiProperty({type: String})
    end_time: Date
    @ApiProperty()
    total_fare: number;
    @ApiProperty({ enum: ['ONGOING', 'COMPLETED', 'CANCELLED']})
    status: 'ONGOING' | 'COMPLETED' | 'CANCELLED'; 
}