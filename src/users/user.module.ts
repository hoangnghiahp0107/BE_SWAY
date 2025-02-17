import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt/dist';
import { JwtStrategy } from 'src/strategy/jwt.strategy';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UserController],
  providers: [UserService, JwtStrategy],
})
export class UserModule { }
