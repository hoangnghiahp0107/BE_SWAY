import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [WalletController],
  providers: [WalletService, JwtStrategy],
})
export class WalletModule { }
