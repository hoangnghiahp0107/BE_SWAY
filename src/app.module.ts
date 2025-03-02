import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './users/user.module';
import { JwtStrategy } from './strategy/jwt.strategy';
import { TripModule } from './trips/trip.module';
import { FavoriteModule } from './favorites/favorite.module';

@Module({
  imports: [ UserModule, TripModule, FavoriteModule, ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
