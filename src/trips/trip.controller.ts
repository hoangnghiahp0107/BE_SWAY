    import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
    import { ApiTags, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger/dist';
    import { AuthGuard } from '@nestjs/passport';
    import { TripService } from './trip.service';

    @ApiTags("Trip Management")
    @Controller('/api/TripManagement')

    export class TripController{
        constructor(private readonly tripService: TripService) {}
        
        @ApiBearerAuth()
        @UseGuards(AuthGuard("jwt"))
        @HttpCode(200)
        @ApiQuery({ name: 'customer_id', required: true })
        @Get("/get-trip-history")
        async getTripHistory(@Request() req) {
            const customer_id  = req.user.data.CUSTOMER_ID;
            const requestedCustomerId = parseInt(req.query.customer_id);
            if (customer_id !== requestedCustomerId) {
                throw new HttpException('Bạn chỉ có thể cập nhật thông tin của chính mình', HttpStatus.FORBIDDEN);
            }
        
            return this.tripService.getTripHistory(customer_id);
        }
        
        
        
    }
