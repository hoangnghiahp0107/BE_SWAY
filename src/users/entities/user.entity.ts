import { ApiProperty } from "@nestjs/swagger";

export class SignUpCustomer {
    @ApiProperty()
    fullname: string
    @ApiProperty()
    email: string
    @ApiProperty()
    phone: string
    @ApiProperty()
    password: string
    @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'] })
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    @ApiProperty()
    birthday: String
    @ApiProperty()
    avarta: string
}

export class LoginCustomer {
    @ApiProperty()
    email: string
    @ApiProperty()
    password: string
}

export class checkEmailAndPhone {
    @ApiProperty()
    email: string
    @ApiProperty()
    phone: string
}


export class verifyOtp {
    @ApiProperty()
    email: string
    @ApiProperty()
    otp_code: string
}

export class resendOtp {
    @ApiProperty()
    email: string
}

export class updateCustomer {
    @ApiProperty()
    fullname: string
    @ApiProperty()
    email: string
    @ApiProperty()
    phone: string
    @ApiProperty()
    password: string
    @ApiProperty()
    birthday: string
    @ApiProperty()
    avarta: string
    @ApiProperty({ enum: ['MALE', 'FEMALE', 'OTHER'] })
    gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export class findLocation{
    @ApiProperty()
    latitude: string
    @ApiProperty()
    longitude: string
}

export class bookingDriver{
    @ApiProperty()
    driver_id: number
    @ApiProperty()
    total_fare: number
    @ApiProperty()
    promotion_code: string
    @ApiProperty()
    pickup_point: string
    @ApiProperty()
    dropoff_point: string
    @ApiProperty()
    pickup_coordinates: { lat: number; lng: number }
    @ApiProperty()
    dropoff_coordinates: { lat: number; lng: number }
    @ApiProperty()
    payment_method: "CASH" | "CREDIT_CARD" | "E-WALLET";
    @ApiProperty()
    payment_status: "COMPLETED" | "PENDING" | "FAILED";
}
