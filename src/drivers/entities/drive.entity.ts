import { ApiProperty } from "@nestjs/swagger";

export class SignUpDriver {
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

export class LoginDriver {
    @ApiProperty()
    email: string
    @ApiProperty()
    password: string
}

export class checkEmailAndPhoneDriver {
    @ApiProperty()
    email: string
    @ApiProperty()
    phone: string
}


export class verifyOtpDriver {
    @ApiProperty()
    email: string
    @ApiProperty()
    otp_code: string
}

export class resendOtpDriver {
    @ApiProperty()
    email: string
}

export class updateDriver {
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
    cccd: string
    @ApiProperty()
    crc: string
    @ApiProperty()
    license: string
}

