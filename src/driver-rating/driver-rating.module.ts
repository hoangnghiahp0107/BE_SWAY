import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { DriverRatingController } from '../driver-rating/driver-rating.controller';
import { DriverRatingService } from '../driver-rating/driver-rating.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [DriverRatingController],
  providers: [DriverRatingService, JwtStrategy],
})
export class DriverRatingModule {}
