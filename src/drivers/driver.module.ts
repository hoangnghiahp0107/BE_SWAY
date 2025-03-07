import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [DriverController],
  providers: [DriverService, JwtStrategy],
})
export class DriverModule { }
