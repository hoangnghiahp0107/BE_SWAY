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
}

export class LoginCustomer {
    @ApiProperty()
    email: string
    @ApiProperty()
    password: string
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


