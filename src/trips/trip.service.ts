import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt/dist';
import { PrismaClient } from '@prisma/client';
import { TripHistoryDto } from './dto/get-history.dto';

@Injectable()
export class TripService{
    constructor(
        private jwtService: JwtService,
    ) {}

    model = new PrismaClient();

    async getTripHistory(customer_id: number) {
        try {
            const tripHistory = await this.model.tRIP_HISTORY.findMany({
                where: {
                    CUSTOMER_ID: customer_id
                },
                orderBy: {
                    START_TIME: 'desc',
                }
            });
            return tripHistory;
        } catch (error) {
            throw new HttpException(error.response?.message || 'Internal Server Error', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
}