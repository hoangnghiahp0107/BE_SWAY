import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt/dist';
import { ConfigService } from '@nestjs/config';
import { DRIVER, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login-user.dto';
import { SignUpDto } from './dto/create-user.dto';
import * as nodemailer from 'nodemailer';
import { findLocation } from './entities/user.entity';
import { BookingDriver } from './dto/booking.dto';

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

    // async findDriver(customer_id: number, vehicle_type_id: number) {
    //     try {
    //         const vehicles = await this.model.vEHICLE.findMany({
    //             where: { VEHICLE_TYPE_ID: vehicle_type_id },
    //             select: { DRIVER_ID: true },
    //         });
    
    //         if (vehicles.length === 0 || !vehicles.some(vehicle => vehicle.DRIVER_ID)) {
    //             throw new HttpException('Không có xe hoặc tài xế không hợp lệ', HttpStatus.BAD_REQUEST);
    //         }
    
    //         // Lấy danh sách tất cả các DRIVER_ID
    //         const driverIds = vehicles.map(vehicle => vehicle.DRIVER_ID);
    
    //         // Lấy thông tin khách hàng
    //         const customer = await this.model.cUSTOMER.findUnique({
    //             where: { CUSTOMER_ID: customer_id },
    //             select: { LATITUDE: true, LONGITUDE: true },
    //         });
    
    //         // Kiểm tra nếu thông tin khách hàng không hợp lệ
    //         if (!customer || customer.LATITUDE === null || customer.LONGITUDE === null) {
    //             throw new HttpException('Tọa độ khách hàng không hợp lệ hoặc không tồn tại', HttpStatus.BAD_REQUEST);
    //         }
        
    //         const lat = parseFloat(customer.LATITUDE.toString());
    //         const lon = parseFloat(customer.LONGITUDE.toString());
    
    //         if (isNaN(lat) || isNaN(lon)) {
    //             throw new HttpException('Tọa độ khách hàng không hợp lệ', HttpStatus.BAD_REQUEST);
    //         }
    
    //         let radius = 1;
    //         let drivers: DRIVER[] = [];
    
    //         // Tìm các tài xế trong bán kính 10km từ vị trí khách hàng
    //         while (radius <= 5) {
    //             drivers = await this.model.dRIVER.findMany({
    //                 where: {
    //                     AND: [
    //                         {
    //                             LATITUDE: {
    //                                 gte: lat - (radius / 111),
    //                                 lte: lat + (radius / 111),
    //                             },
    //                         },
    //                         {
    //                             LONGITUDE: {
    //                                 gte: lon - (radius / (111 * Math.cos(lat * Math.PI / 180))),
    //                                 lte: lon + (radius / (111 * Math.cos(lat * Math.PI / 180))),
    //                             },
    //                         },
    //                         {
    //                             DRIVER_ID: {
    //                                 in: driverIds, // Tìm tài xế có DRIVER_ID nằm trong danh sách driverIds
    //                             },
    //                         },
    //                         {
    //                             STATUS: "AVAILABLE",
    //                         }
    //                     ],
    //                 },
    //                 include: {
    //                     VEHICLE: true
    //                 },
    //                 take: 5,
    //             });
    
    //             if (drivers.length > 0) {
    //                 break;
    //             }
    
    //             radius += 1;
    //         }
    
    //         // Nếu không tìm thấy tài xế trong bán kính 10km
    //         if (drivers.length === 0) {
    //             throw new HttpException('Không tìm thấy tài xế trong bán kính 5 km', HttpStatus.NOT_FOUND);
    //         }
    
    //         return drivers;
    //     } catch (error) {
    //         console.error('Lỗi khi tìm tài xế:', error);
    //         throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    //     }
    // }



    async bookingDriver(customer_id: number, bookingDriver: BookingDriver) {
        try {
            let {
                driver_id,
                total_fare,
                promotion_code,
                pickup_point,
                pickup_coordinates,
                dropoff_point,
                dropoff_coordinates,
                payment_method,
                payment_status,
            } = bookingDriver;
    
            // Kiểm tra và đảm bảo total_fare là một số hợp lệ
            if (isNaN(total_fare) || total_fare <= 0) {
                throw new Error('Total fare không hợp lệ');
            }
    
            // Kiểm tra mã giảm giá (promotion_code) nếu có
            if (promotion_code) {
                const promotion = await this.model.pROMOTION.findFirst({
                    where: { PROMOTION_CODE: promotion_code },
                    select: { DISCOUNT_PERCENT: true, MAX_DISCOUNT: true, MINIMUM_PURCHASE: true, VALID_FROM: true, VALID_TO: true }
                });
    
                if (!promotion) {
                    throw new Error('Mã khuyến mãi không hợp lệ.');
                }
    
                // Kiểm tra thời gian hiệu lực của mã khuyến mãi
                const currentDate = new Date();
                if (currentDate < new Date(promotion.VALID_FROM) || currentDate > new Date(promotion.VALID_TO)) {
                    throw new Error('Mã khuyến mãi không còn hiệu lực.');
                }
    
                // Kiểm tra điều kiện mua tối thiểu để áp dụng khuyến mãi
                if (total_fare < promotion.MINIMUM_PURCHASE) {
                    throw new Error(`Đơn hàng của bạn chưa đủ điều kiện để áp dụng mã khuyến mãi. Đơn hàng tối thiểu là ${promotion.MINIMUM_PURCHASE}.`);
                }
    
                // Tính số tiền giảm giá (theo phần trăm) và đảm bảo không vượt quá giới hạn giảm giá tối đa
                const discountAmount = total_fare * (promotion.DISCOUNT_PERCENT / 100);
                const finalDiscount = discountAmount > promotion.MAX_DISCOUNT ? promotion.MAX_DISCOUNT : discountAmount;
    
                // Áp dụng giảm giá
                total_fare = total_fare - finalDiscount;
            }
    
            const pickupPointWKT = `POINT(${pickup_coordinates.lng} ${pickup_coordinates.lat})`;
            const dropoffPointWKT = `POINT(${dropoff_coordinates.lng} ${dropoff_coordinates.lat})`;
    
            // Thực hiện truy vấn SQL với giá trị đã được kiểm tra
            await this.model.$queryRaw`
                INSERT INTO TRIP_HISTORY 
                (CUSTOMER_ID, DRIVER_ID, PICKUP_POINT, DROPOFF_POINT, PICKUP_COORDINATES, DROPOFF_COORDINATES, TOTAL_FARE, PROMOTION_CODE, PAYMENT_METHOD, PAYMENT_STATUS) 
                VALUES 
                (${customer_id}, ${driver_id}, ${pickup_point}, ${dropoff_point}, ST_GeomFromText(${pickupPointWKT}), ST_GeomFromText(${dropoffPointWKT}), ${total_fare}, ${promotion_code ? promotion_code : null}, ${payment_method}, ${payment_status})
            `;
    
            // Cập nhật trạng thái tài xế
            await this.model.$queryRaw`
                UPDATE DRIVER 
                SET STATUS = 'ON TRIP' 
                WHERE DRIVER_ID = ${driver_id}
            `;
    
            return {
                message: 'Bạn đã đặt xe thành công!',
                statusCode: HttpStatus.OK,
            };
        } catch (error) {
            console.error('Lỗi khi xử lý đặt xe:', error);
            throw new HttpException(
                error.message || 'Lỗi hệ thống khi xử lý đặt xe',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
    
    
    
    // async bookingDriver(customer_id: number, bookingDriver: BookingDriver) {
    //     try {
    //         const { 
    //             vehicle_type_id, 
    //             promotion_code, 
    //             pickup_point, 
    //             dropoff_point, 
    //             pickup_coordinates, 
    //             dropoff_coordinates, 
    //             payment_method, 
    //             payment_status 
    //         } = bookingDriver;
    
    //         // Kiểm tra đầu vào: Đảm bảo các tham số quan trọng được cung cấp
    //         if (!customer_id || !vehicle_type_id || !pickup_coordinates || !dropoff_coordinates || !pickup_point || !dropoff_point || !payment_method || !payment_status) {
    //             throw new Error('Thiếu thông tin quan trọng như ID khách hàng, loại phương tiện, tọa độ, điểm đón, điểm trả, phương thức thanh toán hoặc trạng thái thanh toán.');
    //         }
    
    //         // Ensure coordinates are provided correctly
    //         if (!pickup_coordinates.lat || !pickup_coordinates.lng || !dropoff_coordinates.lat || !dropoff_coordinates.lng) {
    //             throw new Error('Tọa độ điểm đón và trả không hợp lệ.');
    //         }
    
    //         // Tính khoảng cách giữa hai điểm (đơn vị km)
    //         const distance = this.calculateDistance(
    //             pickup_coordinates.lat,
    //             pickup_coordinates.lng,
    //             dropoff_coordinates.lat,
    //             dropoff_coordinates.lng
    //         );
    
    //         // Lấy giá từ bảng VEHICLE_TYPE theo vehicle_type_id
    //         const vehicleType = await this.model.vEHICLE_TYPE.findFirst({
    //             where: { VEHICLE_TYPE_ID: vehicle_type_id },
    //             select: { PRICE: true }
    //         });
    
    //         if (!vehicleType) {
    //             throw new Error('Không tìm thấy loại phương tiện với ID tương ứng.');
    //         }
    
    //         // Tính total_fare (giá * khoảng cách)
    //         let totalFare = vehicleType.PRICE * distance;
    
    //         // Kiểm tra và tính toán giảm giá nếu có mã khuyến mãi
            // if (promotion_code) {
            //     const promotion = await this.model.pROMOTION.findFirst({
            //         where: { PROMOTION_CODE: promotion_code },
            //         select: { DISCOUNT_PERCENT: true, MAX_DISCOUNT: true, MINIMUM_PURCHASE: true, VALID_FROM: true, VALID_TO: true }
            //     });
    
            //     if (!promotion) {
            //         throw new Error('Mã khuyến mãi không hợp lệ.');
            //     }
    
            //     // Kiểm tra thời gian hiệu lực của mã khuyến mãi
            //     const currentDate = new Date();
            //     if (currentDate < new Date(promotion.VALID_FROM) || currentDate > new Date(promotion.VALID_TO)) {
            //         throw new Error('Mã khuyến mãi không còn hiệu lực.');
            //     }
    
            //     // Kiểm tra điều kiện mua tối thiểu để áp dụng khuyến mãi
            //     if (totalFare < promotion.MINIMUM_PURCHASE) {
            //         throw new Error(`Đơn hàng của bạn chưa đủ điều kiện để áp dụng mã khuyến mãi. Đơn hàng tối thiểu là ${promotion.MINIMUM_PURCHASE}.`);
            //     }
    
            //     // Tính số tiền giảm giá (theo phần trăm) và đảm bảo không vượt quá giới hạn giảm giá tối đa
            //     const discountAmount = totalFare * (promotion.DISCOUNT_PERCENT / 100);
            //     const finalDiscount = discountAmount > promotion.MAX_DISCOUNT ? promotion.MAX_DISCOUNT : discountAmount;
    
            //     // Áp dụng giảm giá
            //     totalFare = totalFare - finalDiscount;
            // }
    
    //         // Lấy tài xế gần điểm đón (dựa trên phương thức findDriver)
    //         const availableDrivers = await this.findDriver(customer_id, vehicle_type_id);
    
    //         if (availableDrivers.length === 0) {
    //             throw new Error('Không tìm thấy tài xế phù hợp trong khu vực.');
    //         }
    
    //         // Tìm tài xế có ít cuốc nhất trong ngày
    //         const driverWithLeastTrips = await this.findDriverWithLeastTrips(availableDrivers);
    
    //         if (!driverWithLeastTrips) {
    //             throw new Error('Không thể tìm được tài xế có ít cuốc nhất.');
    //         }
    
    //         // Chuyển đổi tọa độ thành WKT (Well-Known Text) cho ST_GeomFromText
    //         const pickupPointWKT = `POINT(${pickup_coordinates.lng} ${pickup_coordinates.lat})`;
    //         const dropoffPointWKT = `POINT(${dropoff_coordinates.lng} ${dropoff_coordinates.lat})`;
    
    //         // Lấy thông tin phương tiện của tài xế đã chọn
    //         const vehicle = await this.model.vEHICLE.findFirst({
    //             where: {
    //                 DRIVER_ID: driverWithLeastTrips.DRIVER_ID,
    //                 VEHICLE_TYPE_ID: vehicle_type_id,
    //             },
    //             select: { VEHICLE_ID: true },
    //         });
    
    //         if (!vehicle) {
    //             throw new Error('Không tìm thấy phương tiện phù hợp với tài xế.');
    //         }
    
    //         // Chèn thông tin vào bảng TRIP_HISTORY, bao gồm các thông tin thanh toán và điểm đón, điểm trả
    //         const newBooking = await this.model.$queryRaw`
    //             INSERT INTO TRIP_HISTORY 
    //             (CUSTOMER_ID, DRIVER_ID, VEHICLE_ID, PICKUP_POINT, DROPOFF_POINT, PICKUP_COORDINATES, DROPOFF_COORDINATES, TOTAL_FARE, PROMOTION_CODE, PAYMENT_METHOD, PAYMENT_STATUS) 
    //             VALUES 
    //             (${customer_id}, ${driverWithLeastTrips.DRIVER_ID}, ${vehicle.VEHICLE_ID}, ${pickup_point}, ${dropoff_point}, ST_GeomFromText(${pickupPointWKT}), ST_GeomFromText(${dropoffPointWKT}), ${totalFare}, ${promotion_code ? promotion_code : null}, ${payment_method}, ${payment_status})
    //         `;
    
    //         await this.model.$queryRaw`
    //         UPDATE DRIVER 
    //         SET STATUS = 'ON TRIP' 
    //         WHERE DRIVER_ID = ${driverWithLeastTrips.DRIVER_ID}
    //         `;
    
    //         return {
    //             message: 'Bạn đã đặt xe thành công!',
    //             statusCode: HttpStatus.OK,
    //             data: { newBooking }
    //         };
    //     } catch (error) {
    //         console.error('Lỗi khi người dùng đặt xe:', error);
    //         throw new HttpException(
    //             error.message || 'Lỗi hệ thống',
    //             HttpStatus.INTERNAL_SERVER_ERROR
    //         );
    //     }
    // }
    
    
    
    
    // Tìm tài xế có ít cuốc nhất trong ngày
    async findDriverWithLeastTrips(drivers: any[]) {
        const driverIds = drivers.map(driver => driver.DRIVER_ID);

        // Kiểm tra nếu không có tài xế
        if (driverIds.length === 0) {
            throw new Error("Không có tài xế hợp lệ để tìm cuốc.");
        }

        // Câu lệnh SQL để đếm số cuốc trong ngày của từng tài xế
        const tripCounts = await this.model.$queryRaw<{
            DRIVER_ID: number;
            TRIP_COUNT: number;
        }[]>`
            SELECT DRIVER_ID, COUNT(*) AS TRIP_COUNT
            FROM TRIP_HISTORY
            WHERE DRIVER_ID IN (${driverIds.join(',')})
            AND DATE(START_TIME) = CURRENT_DATE
            AND STATUS = 'COMPLETED'  -- Lọc chỉ các cuốc đã hoàn thành
            GROUP BY DRIVER_ID
            ORDER BY TRIP_COUNT ASC
            LIMIT 1;
        `;

        // Nếu không tìm thấy cuốc nào, trả về tài xế đầu tiên trong danh sách
        if (tripCounts.length === 0) {
            return { DRIVER_ID: driverIds[0], TRIP_COUNT: 0 }; // Chọn tài xế đầu tiên và mặc định số cuốc là 0
        }

        // Trả về tài xế có ít cuốc nhất
        return tripCounts[0];
    }

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
            console.log("DEBUG: customerUpdate nhận được =", customerUpdate);
    
            // Chuyển tất cả key trong request body về chữ thường để tránh lỗi
            const normalizedUpdate = Object.keys(customerUpdate).reduce((acc, key) => {
                acc[key.toLowerCase()] = customerUpdate[key]; // Chuyển key về chữ thường
                return acc;
            }, {} as any);
    
            console.log("DEBUG: Dữ liệu sau khi chuẩn hóa =", normalizedUpdate);
    
            const { customer_id, fullname, phone, birthday, gender } = normalizedUpdate;
    
            if (!customer_id) {
                throw new HttpException('Thiếu customer_id', HttpStatus.BAD_REQUEST);
            }
    
            const existingUser = await this.model.cUSTOMER.findFirst({
                where: { CUSTOMER_ID: customer_id }
            });
    
            if (!existingUser) {
                throw new HttpException(`Người dùng không tồn tại: ${customer_id}`, HttpStatus.NOT_FOUND);
            }
    
            const updatedData: any = {};
            if (fullname !== undefined) updatedData.FULLNAME = fullname;
            if (phone !== undefined) updatedData.PHONE = phone;
            if (birthday !== undefined) updatedData.BIRTHDAY = new Date(birthday);
            if (gender !== undefined) updatedData.GENDER = gender;
    
            console.log("DEBUG: Dữ liệu cập nhật sau xử lý =", updatedData);
    
            if (Object.keys(updatedData).length > 0) {
                const updateResult = await this.model.cUSTOMER.update({
                    where: { CUSTOMER_ID: customer_id },
                    data: updatedData
                });
    
                console.log("DEBUG: Kết quả update =", updateResult);
            } else {
                console.log("DEBUG: Không có dữ liệu nào để cập nhật.");
            }
    
            return { message: 'Cập nhật thông tin thành công' };
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin:', error.message, error.stack);
            throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    async changePassword(customer_id: number, oldPassword: string, newPassword: string) {
        try {
            const user = await this.model.cUSTOMER.findFirst({
                where: { CUSTOMER_ID: customer_id }
            });
    
            if (!user) {
                throw new HttpException('Người dùng không tồn tại', HttpStatus.NOT_FOUND);
            }
    
            const isMatch = await bcrypt.compare(oldPassword, user.PASSWORD);
            if (!isMatch) {
                throw new HttpException('Mật khẩu cũ không chính xác', HttpStatus.BAD_REQUEST);
            }
    
            const hashedPassword = await bcrypt.hash(newPassword, 10);
    
            await this.model.cUSTOMER.update({
                where: { CUSTOMER_ID: customer_id },
                data: { PASSWORD: hashedPassword }
            });
    
            return { message: 'Đổi mật khẩu thành công' };
        } catch (error) {
            console.error('Lỗi khi đổi mật khẩu:', error.message);
            throw new HttpException(error.response?.message || 'Lỗi hệ thống', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
  