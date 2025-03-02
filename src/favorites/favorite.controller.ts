import { Controller, Get, Post, Body, Query, Put, Delete, HttpCode, UseGuards, HttpException, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger/dist';
import { AuthGuard } from '@nestjs/passport';
import { FavoriteLocation } from './entities/favorite.entity';
import { FavoriteDto } from './dto/create-favorite.dto';
import { FavoriteService } from './favorite.service';

@ApiTags("Favorite Management")
@Controller('/api/FavoriteManagement')

export class FavoriteController{
    constructor(private readonly favoriteService: FavoriteService) {}
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @HttpCode(200)
    @ApiBody({
        type: FavoriteLocation,
    })
    @Post('/add-favorite-location')
    async addFavoriteLocation(@Body() body: FavoriteDto, @Request() req: any) {
      const customer_id = req.user?.data?.CUSTOMER_ID;
      if (!customer_id) {
        throw new Error('Customer ID not found in token.');
      }
    
      try {
        return await this.favoriteService.addFavoriteLocation(body, customer_id);
      } catch (error) {
        console.error('Error in addFavoriteLocation controller:', error);
        throw new Error('Failed to add favorite location. Please try again later.');
      }
    }
}