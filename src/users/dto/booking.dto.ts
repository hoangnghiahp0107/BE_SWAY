export class BookingDriver{
    promotion_code: string;
    pickup_point: string;
    dropoff_point: string;
    vehicle_type_id: number;
    pickup_coordinates: { lat: number; lng: number };
    dropoff_coordinates: { lat: number; lng: number };
    payment_method: "CASH" | "CREDIT_CARD" | "E-WALLET";
    payment_status: "COMPLETED" | "PENDING" | "FAILED";
}