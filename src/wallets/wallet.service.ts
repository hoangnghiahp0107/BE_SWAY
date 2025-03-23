import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import PayOS from '@payos/node'; 
import { DepositWalletDTO } from './dto/deposit.dto';
import { createHmac } from 'crypto';

const payOS = new PayOS(
    process.env.PAYOS_CLIENT_ID!,
    process.env.PAYOS_API_KEY!,    
    process.env.PAYOS_CHECKSUM_KEY!
);

@Injectable()
export class WalletService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    model = new PrismaClient();

    // Hàm xử lý nạp tiền vào ví
    async depositWallet(depositWalletDTO: DepositWalletDTO, customer_id: number, driver_id: number) {
      const { amount, description, status } = depositWalletDTO;
      try {
          // Determine walletId based on customer_id or driver_id
          let walletId;
          if (customer_id) {
              // Get the wallet for the customer
              const wallet = await this.model.wALLET.findFirst({
                  where: { CUSTOMER_ID: customer_id },
              });
              if (!wallet) {
                  throw new HttpException('Customer does not have a wallet', HttpStatus.NOT_FOUND);
              }
              walletId = wallet.WALLET_ID;
          } else if (driver_id) {
              // Get the wallet for the driver
              const wallet = await this.model.wALLET.findFirst({
                  where: { DRIVER_ID: driver_id },
              });
              if (!wallet) {
                  throw new HttpException('Driver does not have a wallet', HttpStatus.NOT_FOUND);
              }
              walletId = wallet.WALLET_ID;
          } else {
              throw new HttpException('No valid customer or driver ID found', HttpStatus.UNAUTHORIZED);
          }
  
            // Tạo mã giao dịch duy nhất (orderCode)
            const ORDERCODE = Number(String(Date.now()).slice(-6));

            const cancelUrl = 'https://yourdomain.com/cancel';  
            const returnUrl = 'https://yourdomain.com/return';  

            // Gọi API PayOS để tạo giao dịch
            const paymentResponse = await payOS.createPaymentLink({
                amount: amount,
                orderCode: ORDERCODE,
                description: description || await this.generateUniqueDescription(new Set()),
                cancelUrl: cancelUrl,
                returnUrl: returnUrl,
            });


            // Lưu giao dịch vào cơ sở dữ liệu
            await this.model.wALLET_TRANSACTION.create({
                data: {
                    WALLET_ID: walletId,  
                    AMOUNT: amount,  
                    TRANSACTION_TYPE: "DEPOSIT",  
                    DESCRIPTION: description || await this.generateUniqueDescription(new Set()),
                    ORDERCODE: ORDERCODE.toString(),  
                    STATUS: status || 'PENDING',  
                },
            });

            return { message: 'Thanh toán thành công với PayOS', paymentResponse };
  
      } catch (error) {
          console.error('Error during wallet deposit:', error);
  
          // Ensure we provide a proper error response if error doesn't have message or response property
          const errorMessage = error.response?.message || error.message || 'An unknown error occurred during the deposit process.';
          const errorStatus = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
  
          throw new HttpException(errorMessage, errorStatus);
      }
  }
  

    private async generateUniqueDescription(usedDescriptions) {
        const getUniqueDescription = () => {
            return Math.floor(100000 + Math.random() * 900000).toString(); // Tạo số ngẫu nhiên 6 chữ số
        };

        let description;
        do {
            description = getUniqueDescription();
        } while (usedDescriptions.has(description)); // Kiểm tra tính duy nhất

        usedDescriptions.add(description); // Đánh dấu đã sử dụng mô tả này
        return description;
    }
}
