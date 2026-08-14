import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

export interface ActiveUser {
  socketId: string;
  userId: string;
  name: string;
  role: string;
  connectedAt: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private activeUsers = new Map<string, ActiveUser>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (this.activeUsers.has(client.id)) {
      this.activeUsers.delete(client.id);
      this.broadcastOnlineUsers();
    }
  }

  @SubscribeMessage('user:identify')
  handleUserIdentify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; name: string; role: string },
  ) {
    if (payload && payload.userId) {
      this.activeUsers.set(client.id, {
        socketId: client.id,
        userId: payload.userId,
        name: payload.name,
        role: payload.role,
        connectedAt: new Date(),
      });
      this.logger.log(`User identified: ${payload.name} (${payload.role}) on socket ${client.id}`);
      this.broadcastOnlineUsers();
    }
  }

  @SubscribeMessage('user:logout')
  handleUserLogout(@ConnectedSocket() client: Socket) {
    if (this.activeUsers.has(client.id)) {
      this.activeUsers.delete(client.id);
      this.broadcastOnlineUsers();
    }
  }

  broadcastOnlineUsers() {
    const onlineList = Array.from(this.activeUsers.values());
    const uniqueUsersMap = new Map<string, ActiveUser>();
    onlineList.forEach((u) => uniqueUsersMap.set(u.userId, u));
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    this.server.emit('users:online', {
      count: uniqueUsers.length,
      users: uniqueUsers,
    });
  }

  broadcastDataChange(event: string, data?: any) {
    this.logger.log(`Broadcasting event ${event}`);
    if (this.server) {
      this.server.emit(event, {
        timestamp: new Date().toISOString(),
        data,
      });
    }
  }
}
