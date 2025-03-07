import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';
import { DRIVER, PrismaClient } from '@prisma/client';
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

    async checkEmailAndPhoneExistence(email: string, phone: string) {
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
        return true;
    }
    
    
    async signUp(customerSignUp: SignUpDto) {
        const { fullname, email, phone, password, gender, birthday } = customerSignUp;
    
        await this.checkEmailAndPhoneExistence(email, phone);
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await this.model.cUSTOMER.create({
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
            where: { CUSTOMER_ID: otpRecord.CUSTOMER_ID ?? undefined },
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

    async getInfoCustomer(customer_id: number){
        try {
            const infoCustomer = await this.model.cUSTOMER.findFirst({
                where:{
                    CUSTOMER_ID: customer_id
                },
                select: {
                    FULLNAME: true,
                    EMAIL: true,
                    PHONE: true,
                    BIRTHDAY: true,
                    AVARTA: true,
                    GENDER: true
                }
            })
            return infoCustomer;
        } catch (error) {
            throw new HttpException(error.response?.message || 'Internal Server Error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async findDriver(customer_id: number, vehicle_type_id: number) {
        try {
            const vehicles = await this.model.vEHICLE.findMany({
                where: { VEHICLE_TYPE_ID: vehicle_type_id },
                select: { DRIVER_ID: true },
            });
    
            if (vehicles.length === 0 || !vehicles.some(vehicle => vehicle.DRIVER_ID)) {
                throw new HttpException('Không có xe hoặc tài xế không hợp lệ', HttpStatus.BAD_REQUEST);
            }
    
            // Lấy danh sách tất cả các DRIVER_ID
            const driverIds = vehicles.map(vehicle => vehicle.DRIVER_ID);
    
            // Lấy thông tin khách hàng
            const customer = await this.model.cUSTOMER.findUnique({
                where: { CUSTOMER_ID: customer_id },
                select: { LATITUDE: true, LONGITUDE: true },
            });
    
            // Kiểm tra nếu thông tin khách hàng không hợp lệ
            if (!customer || customer.LATITUDE === null || customer.LONGITUDE === null) {
                throw new HttpException('Tọa độ khách hàng không hợp lệ hoặc không tồn tại', HttpStatus.BAD_REQUEST);
            }
        
            const lat = parseFloat(customer.LATITUDE.toString());
            const lon = parseFloat(customer.LONGITUDE.toString());
    
            if (isNaN(lat) || isNaN(lon)) {
                throw new HttpException('Tọa độ khách hàng không hợp lệ', HttpStatus.BAD_REQUEST);
            }
    
            let radius = 1;
            let drivers: DRIVER[] = [];
    
            // Tìm các tài xế trong bán kính 10km từ vị trí khách hàng
            while (radius <= 10) {
                drivers = await this.model.dRIVER.findMany({
                    where: {
                        AND: [
                            {
                                LATITUDE: {
                                    gte: lat - (radius / 111),
                                    lte: lat + (radius / 111),
                                },
                            },
                            {
                                LONGITUDE: {
                                    gte: lon - (radius / (111 * Math.cos(lat * Math.PI / 180))),
                                    lte: lon + (radius / (111 * Math.cos(lat * Math.PI / 180))),
                                },
                            },
                            {
                                DRIVER_ID: {
                                    in: driverIds, // Tìm tài xế có DRIVER_ID nằm trong danh sách driverIds
                                },
                            },
                            {
                                STATUS: "AVAILABLE",
                            }
                        ],
                    },
                    take: 5,
                });
    
                if (drivers.length > 0) {
                    break;
                }
    
                radius += 1;
            }
    
            // Nếu không tìm thấy tài xế trong bán kính 10km
            if (drivers.length === 0) {
                throw new HttpException('Không tìm thấy tài xế trong bán kính 10 km', HttpStatus.NOT_FOUND);
            }
    
            return drivers;
        } catch (error) {
            console.error('Lỗi khi tìm tài xế:', error);
            throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    // async bookingDriver(customer_id: number, driver_id: number, vehicle_id: number, route_id: number, payment_id: number, start_time: Date, total_fare: number, promotion_id: number | null, status: string, dropoff_lat: number, dropoff_lon: number, vehicle_type_id: number) {
    //     try {
    //         const drivers = await this.findDriver(customer_id, vehicle_type_id);
    //         // Kiểm tra nếu không có tài xế nào phù hợp
    //         if (drivers.length === 0) {
    //             throw new HttpException('Không tìm thấy tài xế phù hợp', HttpStatus.NOT_FOUND);
    //         }

    //         // Bước 2: Tìm tài xế có số lượng cuốc thấp nhất trong ngày hiện tại
    //         const today = new Date();
    //         const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Bắt đầu ngày
    //         const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // Kết thúc ngày
    //         if (!customer_id || !driver_id || !vehicle_id || !route_id || !payment_id || !start_time || !total_fare || !status) {
    //             throw new HttpException('Thiếu thông tin cần thiết để đặt xe', HttpStatus.BAD_REQUEST);
    //         }
    //         let selectedDriver;
    //         let minTrips = Infinity;
    
    //         for (let driver of drivers) {
    //             const tripCount = await this.model.tRIP_HISTORY.count({
    //                 where: {
    //                     DRIVER_ID: driver.DRIVER_ID,
    //                     START_TIME: {
    //                         gte: startOfDay,
    //                         lte: endOfDay,
    //                     },
    //                 },
    //             });
    
    //             // Chọn tài xế có số lượng cuốc ít nhất
    //             if (tripCount < minTrips) {
    //                 minTrips = tripCount;
    //                 selectedDriver = driver;
    //             }
    //         }
    
    //         // Nếu không tìm thấy tài xế nào
    //         if (!selectedDriver) {
    //             throw new HttpException('Không tìm thấy tài xế phù hợp với ít cuốc nhất trong ngày', HttpStatus.NOT_FOUND);
    //         }
    //         // Bước 3: Lưu thông tin vị trí vào bảng ROUTE
    //         const customer = await this.model.cUSTOMER.findUnique({
    //             where: { CUSTOMER_ID: customer_id },
    //             select: { LATITUDE: true, LONGITUDE: true },
    //         });

    //         if (!customer) {
    //             throw new HttpException('Không tìm thấy thông tin khách hàng', HttpStatus.BAD_REQUEST);
    //         }

    //         // Tạo đối tượng tọa độ khách hàng và điểm đến
    //         const pickupCoordinates = `POINT(${customer.LONGITUDE} ${customer.LATITUDE})`;
    //         const dropoffCoordinates = `POINT(${dropoff_lon} ${dropoff_lat})`;

    //         await this.model.rOUTE.create({
    //             data: {
    //               PICKUP_POINT: customer.PICKUP_POINT,  // Thay bằng dữ liệu thực tế bạn có
    //               DROPOFF_POINT: dropoff_point,  // Dữ liệu điểm đến
    //               PICKUP_COORDINATES: { lat: customer.LATITUDE, lon: customer.LONGITUDE },  // Dữ liệu tọa độ đón
    //               DROPOFF_COORDINATES: { lat: dropoff_lat, lon: dropoff_lon },  // Dữ liệu tọa độ đến
    //             },
    //           });
              
    
    //     } catch (error) {
    //         console.error('Lỗi khi đặt xe:', error);
    //         throw new HttpException(
    //             error.response?.message || 'Lỗi hệ thống',
    //             error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    //         );
    //     }
    // }

    // Hàm tính khoảng cách giữa hai tọa độ (theo công thức Haversine)
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = this.degreesToRadians(lat2 - lat1);
        const dLon = this.degreesToRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Khoảng cách theo km
    }

    // Chuyển độ sang radian
    degreesToRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    
     
    async updateCustomer(customerUpdate: SignUpDto) {
        try {
            const { customer_id, email, fullname, password, gender, phone, birthday, avarta } = customerUpdate;
            
            const existingUser = await this.model.cUSTOMER.findFirst({
                where: { CUSTOMER_ID: customer_id}
            });
        
            if (!existingUser) {
                throw new HttpException(`Người dùng không tồn tại: ${customer_id}`, HttpStatus.NOT_FOUND);
            }
        
            const updatedData: any = {};
            if (email) updatedData.EMAIL = email;
            if (fullname) updatedData.FULLNAME = fullname;
            if (password) updatedData.PASSWORD = await bcrypt.hash(password, 10);
            if (gender) updatedData.GENDER = gender;
            if (phone) updatedData.PHONE = phone;
            if (birthday) updatedData.BIRTHDAY = new Date(birthday);
            if (avarta) updatedData.AVARTA = avarta;

            if (Object.keys(updatedData).length > 0) {
                await this.model.cUSTOMER.update({
                    where: { CUSTOMER_ID: customer_id },
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
  