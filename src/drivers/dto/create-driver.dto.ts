export class SignUpDriverDto {
    driver_id: number;
    fullname: string;
    email: string;
    phone: string;
    password: string;
    birthday: string;
    avarta: string;
    status: 'AVAILABLE' | 'ON TRIP' | 'OFF';
    license: string;
    cccd: string;
    crc: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    active: boolean;
}

export class VerifyDriverOtpDto {
    email: string;
    otp_code: string;
}

export class ResendDriverOtpDto {
    email: string;
}