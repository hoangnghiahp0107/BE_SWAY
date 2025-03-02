import {
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
  } from '@nestjs/websockets';
  
  import { Socket, Server } from 'socket.io'; 

  @WebSocketGateway(3002, { cors:{origin: '*'} })

  export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket){
        console.log("New user connected..", client.id);

        client.broadcast.emit('user-joined', {
            message: `New User Joined the chat: ${client.id}`,
        });
    }

    handleDisconnect(client: any) {
        console.log("user disconnected..", client.id);

        this.server.emit('user-left', {
            message: `User Left the chat: ${client.id}`,
        });
    }

    @SubscribeMessage("new message")
    handleNewMessage(@MessageBody() message: string){
        this.server.emit("message", message);
    }
}