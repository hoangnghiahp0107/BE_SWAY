import { Module } from '@nestjs/common';
import { ChatsGateway } from './chat.gateway';

@Module({
  providers: [ChatsGateway],
})
export class ChatsModule {}