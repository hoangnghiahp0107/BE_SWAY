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

    old_password?: string;  // 🟢 Mật khẩu cũ
    new_password?: string;  // 🟢 Mật khẩu mới
    confirm_password?: string; // 🟢 Xác nhận mật khẩu mới
}

export class VerifyOtpDto {
    email: string;
    otp_code: string;
}

export class ResendOtpDto {
    email: string;
}