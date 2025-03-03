export class SignUpDto {
    fullname: string;
    email: string;
    phone: string;
    password: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';  // Giới tính
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