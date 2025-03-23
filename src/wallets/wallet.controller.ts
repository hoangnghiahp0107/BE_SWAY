import { Controller, Post, Body, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { DepositWalletDTO } from './dto/deposit.dto';
import { AuthGuard } from '@nestjs/passport';
import { depositWallet } from './entities/wallet.entity';

@ApiTags("Wallet Management")
@Controller('/api/WalletManagement')
export class WalletController {
    constructor(private readonly walletService: WalletService) {}

    // POST: Nạp tiền vào ví
    @Post('/deposit-wallet')
    @ApiBody({ type: depositWallet })
    @ApiBearerAuth()
    @HttpCode(200)
    @UseGuards(AuthGuard("jwt"))
    async deposit(@Body() body: DepositWalletDTO, @Request() req: any) {
        try {
            const customer_id = req.user?.data?.CUSTOMER_ID;
            const driver_id = req.user?.data?.DRIVER_ID;
            if (!customer_id && !driver_id) {
                throw new HttpException('Invalid token: No customer_id or driver_id found', HttpStatus.UNAUTHORIZED);
            }

            // Pass the body along with customer_id or driver_id to the service
            return await this.walletService.depositWallet(body, customer_id, driver_id);
        } catch (error) {
            console.error('Error during deposit:', error);
            throw new HttpException('Failed to deposit wallet', HttpStatus.BAD_REQUEST);
        }
    }
}
