import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [TripController],
  providers: [TripService, JwtStrategy],
})
export class TripModule { }
