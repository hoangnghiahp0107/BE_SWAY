export class BookingDriver{
    customer_id: number;
    driver_id: number;
    total_fare: number;
    promotion_code: string;
    pickup_point: string;
    dropoff_point: string;
    pickup_coordinates: { lat: number; lng: number };
    dropoff_coordinates: { lat: number; lng: number };
    payment_method: "CASH" | "CREDIT_CARD" | "E-WALLET";
    payment_status: "COMPLETED" | "PENDING" | "FAILED";
}