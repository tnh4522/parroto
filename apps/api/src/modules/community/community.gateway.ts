import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { getAppEnv } from "../../core/config/env";
import { appLogger } from "../../core/observability/logger.service";

interface SocketUserData {
  userId?: string;
}

@WebSocketGateway({
  namespace: "/ws/community",
  cors: { origin: true, credentials: true },
})
export class CommunityGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const rawToken =
      (client.handshake.auth?.token as string | undefined) ??
      client.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!rawToken) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        rawToken,
        { secret: getAppEnv().JWT_ACCESS_SECRET }
      );
      (client.data as SocketUserData).userId = payload.sub;
      void client.join(`user:${payload.sub}`);
    } catch {
      appLogger.warn("Rejected unauthenticated /ws/community socket handshake");
      client.disconnect(true);
    }
  }

  @SubscribeMessage("speaking:join")
  async handleSpeakingJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string }
  ) {
    if (!payload?.roomId) return;
    await client.join(`speaking:${payload.roomId}`);
    const userId = (client.data as SocketUserData).userId;
    client.to(`speaking:${payload.roomId}`).emit("speaking:peer-joined", {
      roomId: payload.roomId,
      userId,
    });
  }

  @SubscribeMessage("speaking:signal")
  handleSpeakingSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { roomId: string; targetUserId?: string; signal: unknown }
  ) {
    if (!payload?.roomId) return;
    const fromUserId = (client.data as SocketUserData).userId;
    if (payload.targetUserId) {
      this.server.to(`user:${payload.targetUserId}`).emit("speaking:signal", {
        fromUserId,
        roomId: payload.roomId,
        signal: payload.signal,
      });
    } else {
      client.to(`speaking:${payload.roomId}`).emit("speaking:signal", {
        fromUserId,
        roomId: payload.roomId,
        signal: payload.signal,
      });
    }
  }

  @SubscribeMessage("chat:send")
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; message: string }
  ) {
    if (!payload?.roomId || !payload?.message?.trim()) return;
    const userId = (client.data as SocketUserData).userId;
    this.server.to(`speaking:${payload.roomId}`).emit("chat:message", {
      userId,
      roomId: payload.roomId,
      message: payload.message.trim().slice(0, 500),
      sentAt: new Date().toISOString(),
    });
  }
}
