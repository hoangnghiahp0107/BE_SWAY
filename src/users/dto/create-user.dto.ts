export class SignUpDto {
    customer_id: number;
    fullname: string;
    email: string;
    phone: string;
    password: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    active: boolean;
    birthday: string;
    avarta: string;
}

export class VerifyOtpDto {
    email: string;
    otp_code: string;
}

export class ResendOtpDto {
    email: string;
}