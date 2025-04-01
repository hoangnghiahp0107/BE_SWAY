import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

@WebSocketGateway(5000, { cors: { origin: '*' } })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  handleConnection(client: Socket) {
    console.log('New user connected..', client.id);

    client.broadcast.emit('user-joined', {
      message: `New User Joined the chat: ${client.id}`,
    });
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnected..', client.id);

    this.server.emit('user-left', {
      message: `User Left the chat: ${client.id}`,
    });
  }

  @SubscribeMessage('new message')
  async handleNewMessage(
    @MessageBody() data: {
      driverId: number;
      customerId: number;
      senderType: 'CUSTOMER' | 'DRIVER';
      content: string;
    }
  ) {
    const { driverId, customerId, senderType, content } = data;

    try {

      let driver;
      let customer;

      // Fetch customer and driver based on senderType
      if (senderType === 'CUSTOMER') {
        customer = await this.prisma.cUSTOMER.findUnique({
          where: { CUSTOMER_ID: customerId },
        });
        driver = await this.prisma.dRIVER.findUnique({
          where: { DRIVER_ID: driverId },
        });

        if (!customer || !driver) {
          console.log('Invalid customer or driver');
          return;
        }
      }

      if (senderType === 'DRIVER') {
        driver = await this.prisma.dRIVER.findUnique({
          where: { DRIVER_ID: driverId },
        });
        customer = await this.prisma.cUSTOMER.findUnique({
          where: { CUSTOMER_ID: customerId },
        });

        if (!driver || !customer) {
          console.log('Invalid driver or customer');
          return;
        }
      }

      // Save message to the database
      const newMessage = await this.prisma.cHAT_MESSAGE.create({
        data: {
          DRIVER_ID: driverId,
          CUSTOMER_ID: customerId , 
          SENDER_TYPE: senderType,
          CONTENT: content,
        },
      });

      console.log('Message saved to the database:', newMessage);

      // Emit the message to all connected clients
      this.server.emit('message', {
        driverId,
        senderType,
        customerId,
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }
}
