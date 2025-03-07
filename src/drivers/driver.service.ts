import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDriverDto } from './dto/login-driver.dto';
import { SignUpDriverDto } from './dto/create-driver.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class DriverService{
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    model = new PrismaClient();

    async checkEmailAndPhoneExistence(email: string, phone: string) {
        const existingDriver = await this.model.dRIVER.findFirst({
            where: {
                OR: [{ EMAIL: email }, { PHONE: phone }],
            },
        });
    
        if (existingDriver) {
            if (existingDriver.EMAIL === email) {
                throw new HttpException('Email đã tồn tại', HttpStatus.CONFLICT);
            }
            if (existingDriver.PHONE === phone) {
                throw new HttpException('Số điện thoại đã tồn tại', HttpStatus.CONFLICT);
            }
        }    
        return true;
    }
    async signUpDriver(driverSignUp: SignUpDriverDto) {
        const { fullname, email, phone, password, gender, birthday } = driverSignUp;
    
        await this.checkEmailAndPhoneExistence(email, phone);
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const newDriver = await this.model.dRIVER.create({
            data: {
                FULLNAME: fullname,
                EMAIL: email,
                PHONE: phone,
                PASSWORD: hashedPassword,
                GENDER: gender,  
                ACTIVE: false,  
                BIRTHDAY: new Date(birthday),
                AVARTA: "noimg.png"   
            },
        });
    
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpData = {
            OTP_CODE: otp,
            EXPIRES_AT: new Date(Date.now() + 5 * 60 * 1000),
            DRIVER_ID: newDriver.DRIVER_ID,  
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
        const driver = await this.model.dRIVER.findUnique({
            where: { EMAIL: email },  
        });

        if (!driver) {
            throw new HttpException('Email không tồn tại', HttpStatus.NOT_FOUND);
        }

        const otpRecord = await this.model.oTP.findFirst({
            where: {
                DRIVER_ID: driver.DRIVER_ID,  
                OTP_CODE: otp,
                EXPIRES_AT: { gt: new Date() },  
            },
        });

        if (!otpRecord) {
            throw new HttpException('Mã OTP không hợp lệ hoặc đã hết hạn', HttpStatus.BAD_REQUEST);
        }

        await this.model.dRIVER.update({
            where: { DRIVER_ID: otpRecord.DRIVER_ID ?? undefined },
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
        const driver = await this.model.dRIVER.findUnique({
            where: { EMAIL: email },
        });

        if (!driver) {
            throw new HttpException('Email không tồn tại', HttpStatus.NOT_FOUND);
        }

        const driver_id = driver.DRIVER_ID;
        const emailFromDb = driver.EMAIL;

        if (!emailFromDb) {
            throw new HttpException('Email không hợp lệ hoặc không tồn tại', HttpStatus.BAD_REQUEST);
        }

        const existingOtp = await this.model.oTP.findFirst({
            where: {
                DRIVER_ID: driver_id,
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
            DRIVER_ID: driver_id,
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

    
    async loginDriver(driverLogin: LoginDriverDto) {
        const driver = await this.model.dRIVER.findFirst({
            where: { EMAIL: driverLogin.email  },  
        });
    
        if (!driver) {
            throw new HttpException(
                `Email không tồn tại: ${driverLogin.email}`,
                HttpStatus.NOT_FOUND,
            );
        }
    
        if (!driver.ACTIVE) {
            throw new HttpException('Tài khoản chưa được xác thực', HttpStatus.FORBIDDEN);
        }
    
        const isPasswordValid = await bcrypt.compare(driverLogin.password, driver.PASSWORD);
    
        if (!isPasswordValid) {
            throw new HttpException('Sai mật khẩu', HttpStatus.BAD_REQUEST);
        }
    
        try {
            const token = await this.jwtService.signAsync(
                { data: driver },
                { secret: this.configService.get('KEY'), expiresIn: '200m' },
            );
                const { PASSWORD, ...dRIVERWithoutPassword } = driver;
    
            return {
                message: 'Đăng nhập thành công',
                statusCode: HttpStatus.OK,
                data: {
                    driver: dRIVERWithoutPassword,
                    token: `Bearer ${token}`,
                },
            };
        } catch (error) {
            throw new HttpException(error.response.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    async updateDriverInfo(driverUpdate: SignUpDriverDto) {
        try {
            const { email, fullname, phone, birthday, avarta, status, license, password, gender, cccd, crc, driver_id } = driverUpdate;
    
            if (!driver_id) {
                throw new HttpException('Driver ID is required', HttpStatus.BAD_REQUEST);
            }
    
            const existingDriver = await this.model.dRIVER.findFirst({
                where: { DRIVER_ID: driver_id }
            });
    
            if (!existingDriver) {
                throw new HttpException(`Người dùng không tồn tại: ${driver_id}`, HttpStatus.NOT_FOUND);
            }
    
            const updatedData: any = {};
    
            if (fullname) updatedData.FULLNAME = fullname;
            if (email) updatedData.EMAIL = email;
            if (password) updatedData.PASSWORD = await bcrypt.hash(password, 10); // Hash the password if it's provided
            if (gender) updatedData.GENDER = gender;
            if (phone) updatedData.PHONE = phone;
            if (birthday) updatedData.BIRTHDAY = new Date(birthday);
            if (avarta) updatedData.AVARTA = avarta;
            if (status) updatedData.STATUS = status;
            if (license) updatedData.LICENSE = license;
            if (cccd) updatedData.CCCD = cccd;
            if (crc) updatedData.CRC = crc;
    
            if (Object.keys(updatedData).length > 0) {
                await this.model.dRIVER.update({
                    where: { DRIVER_ID: driver_id },
                    data: updatedData
                });
            }
    
            return { message: 'Cập nhật thông tin thành công' };
    
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin:', error);
            throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    
    async getInfoDriver(driver_id: number){
        try {
            const infoDriver = await this.model.dRIVER.findFirst({
                where:{
                    DRIVER_ID: driver_id
                },
                select: {
                    FULLNAME: true,
                    EMAIL: true,
                    PHONE: true,
                    BIRTHDAY: true,
                    AVARTA: true,
                    GENDER: true,
                    LICENSE: true,
                    CCCD: true,
                    CRC: true
                }
            })

            return infoDriver;
        } catch (error) {
            throw new HttpException(error.response?.message || 'Internal Server Error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}