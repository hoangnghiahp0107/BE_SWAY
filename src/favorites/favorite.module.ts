import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FavoriteController],
  providers: [FavoriteService, JwtStrategy],
})
export class FavoriteModule { }
