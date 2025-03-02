import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login-user.dto';
import { SignUpDto } from './dto/create-user.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UserService {
    constructor(
      private jwtService: JwtService,
      private configService: ConfigService,
      
    ) { } 
    model = new PrismaClient();
    
    async signUp(customerSignUp: SignUpDto) {
        const { fullname, email, phone, password, gender, birthday } = customerSignUp;
    
        const existingCustomer = await this.model.cUSTOMER.findFirst({
            where: {
                OR: [{ EMAIL: email }, { PHONE: phone }],
            },
        });
    
        if (existingCustomer) {
            if (existingCustomer.EMAIL === email) {
                throw new HttpException('Email đã tồn tại', HttpStatus.CONFLICT);
            }
            if (existingCustomer.PHONE === phone) {
                throw new HttpException('Số điện thoại đã tồn tại', HttpStatus.CONFLICT);
            }
        }
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await this.model.cUSTOMER.create({
            data: {
                FULLNAME: fullname,
                EMAIL: email,
                PHONE: phone,
                PASSWORD: hashedPassword,
                GENDER: gender,  
                ACTIVE: false,  
                BIRTHDAY: birthday,
                AVARTA: "noimg.png"
            },
        });
    
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = {
            OTP_CODE: otp,
            EXPIRES_AT: new Date(Date.now() + 5 * 60 * 1000),
            CUSTOMER_ID: newCustomer.CUSTOMER_ID,  
        };
    
        try {
            await Promise.all([
                this.sendOtpEmail(email, otp),
                this.model.oTP.create({ data: otpData }), 
            ]);
    
            return {
                message: 'Mã OTP đã được gửi qua email, vui lòng kiểm tra hộp thư của bạn.',
                statusCode: HttpStatus.OK,
            };
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw new HttpException('Không thể gửi mã OTP, vui lòng thử lại sau.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    async sendOtpEmail(email: string, otp: string) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD, 
            },
        });
    
        const mailOptions = {
            from: process.env.EMAIL, 
            to: email, 
            subject: 'Mã OTP xác thực', 
            text: `Mã OTP của bạn là: ${otp}`, 
        };
    
        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw new HttpException('Không thể gửi mã OTP, vui lòng thử lại sau.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async verifyOtp(email: string, otp: string) {
        const customer = await this.model.cUSTOMER.findUnique({
            where: { EMAIL: email },  
        });

        if (!customer) {
            throw new HttpException('Email không tồn tại', HttpStatus.NOT_FOUND);
        }

        const otpRecord = await this.model.oTP.findFirst({
            where: {
                CUSTOMER_ID: customer.CUSTOMER_ID,  
                OTP_CODE: otp,
                EXPIRES_AT: { gt: new Date() },  
            },
        });

        if (!otpRecord) {
            throw new HttpException('Mã OTP không hợp lệ hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
        }

        await this.model.cUSTOMER.update({
            where: { CUSTOMER_ID: otpRecord.CUSTOMER_ID },
            data: { ACTIVE: true },
        });

        await this.model.oTP.delete({
            where: { OTP_ID: otpRecord.OTP_ID },
        });

        return {
            message: 'Xác thực OTP thành công!',
            statusCode: HttpStatus.OK,
        };
    }

    async resendOtp(email: string) {
        const customer = await this.model.cUSTOMER.findUnique({
            where: { EMAIL: email },
        });

        if (!customer) {
            throw new HttpException('Email không tồn tại', HttpStatus.NOT_FOUND);
        }

        const customerId = customer.CUSTOMER_ID;
        const emailFromDb = customer.EMAIL;

        if (!emailFromDb) {
            throw new HttpException('Email không hợp lệ hoặc không tồn tại', HttpStatus.BAD_REQUEST);
        }

        const existingOtp = await this.model.oTP.findFirst({
            where: {
                CUSTOMER_ID: customerId,
                EXPIRES_AT: { gt: new Date() },  
            },
        });

        if (existingOtp) {
            await this.model.oTP.delete({
                where: { OTP_ID: existingOtp.OTP_ID },
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = {
            OTP_CODE: otp,
            EXPIRES_AT: new Date(Date.now() + 5 * 60 * 1000), 
            CUSTOMER_ID: customerId,
        };

        try {
            await this.model.oTP.create({ data: otpData });

            await this.sendOtpEmail(emailFromDb, otp);

            return {
                message: 'Mã OTP mới đã được gửi qua email, vui lòng kiểm tra hộp thư của bạn.',
                statusCode: HttpStatus.OK,
            };
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw new HttpException('Không thể gửi mã OTP, vui lòng thử lại sau.', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    
    async login(customerLogin: LoginDto) {
        const customer = await this.model.cUSTOMER.findFirst({
            where: { EMAIL: customerLogin.email  },  
        });
    
        if (!customer) {
            throw new HttpException(
                `Email không tồn tại: ${customerLogin.email}`,
                HttpStatus.NOT_FOUND,
            );
        }
    
        if (!customer.ACTIVE) {
            throw new HttpException('Tài khoản chưa được xác thực', HttpStatus.FORBIDDEN);
        }
    
        const isPasswordValid = await bcrypt.compare(customerLogin.password, customer.PASSWORD);
    
        if (!isPasswordValid) {
            throw new HttpException('Sai mật khẩu', HttpStatus.BAD_REQUEST);
        }
    
        try {
            const token = await this.jwtService.signAsync(
                { data: customer },
                { secret: this.configService.get('KEY'), expiresIn: '200m' },
            );
                const { PASSWORD, ...customerWithoutPassword } = customer;
    
            return {
                message: 'Đăng nhập thành công',
                statusCode: HttpStatus.OK,
                data: {
                    customer: customerWithoutPassword,
                    token: `Bearer ${token}`,
                },
            };
        } catch (error) {
            throw new HttpException(error.response.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    async updateCustomer(customerUpdate: SignUpDto) {
        try {
            const { email, fullname, password, gender } = customerUpdate;
            
            const existingUser = await this.model.cUSTOMER.findFirst({
                where: { EMAIL: email }
            });
        
            if (!existingUser) {
                throw new HttpException(`Người dùng không tồn tại: ${email}`, HttpStatus.NOT_FOUND);
            }
        
            const updatedData: any = {};
            if (fullname) updatedData.FULLNAME = fullname;
            if (password) updatedData.PASSWORD = await bcrypt.hash(password, 10);
            if (gender) updatedData.GENDER = gender;
        
            if (Object.keys(updatedData).length > 0) {
                await this.model.cUSTOMER.update({
                    where: { EMAIL: email },
                    data: updatedData
                });
            }
        
            return { message: 'Cập nhật thông tin thành công' };
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin:', error);  
            throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }    
}
  