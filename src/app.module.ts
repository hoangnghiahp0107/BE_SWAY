import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './users/user.module';
import { JwtStrategy } from './strategy/jwt.strategy';
import { TripModule } from './trips/trip.module';
import { FavoriteModule } from './favorites/favorite.module';
import { DriverModule } from './drivers/driver.module';
import { DriverRatingModule } from './driver-rating/driver-rating.module'; // Import DriverRatingModule
import { ChatsGateway } from './chats/chat.gateway';
import { WalletModule } from './wallets/wallet.module';

@Module({
  imports: [
    UserModule,
    DriverModule,
    TripModule,
    FavoriteModule,
    ChatsGateway,
    WalletModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DriverRatingModule, // Thêm module đánh giá tài xế
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
