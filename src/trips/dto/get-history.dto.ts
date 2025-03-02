export class TripHistoryDto{
    customer_id: number;
    driver_id: number;
    vehicle_id: number;
    route_id: number;
    start_time: Date;
    end_time: Date
    total_fare: number;
    status: 'ONGOING' | 'COMPLETED' | 'CANCELLED'; 
}