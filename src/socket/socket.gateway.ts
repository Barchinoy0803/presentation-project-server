import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from 'generated/prisma';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private prisma: PrismaService) {}

  handleConnection(socket: Socket) {
    console.log(`User connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join-presentation')
  async joinPresentation(
    @MessageBody()
    data: {
      nickname: string;
      presentationId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { nickname, presentationId } = data;

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        users: true,
        slides: { include: { blocks: true } },
      },
    });

    if (!presentation) {
      client.emit('error', 'Presentation not found');
      return;
    }

    let existingUser = await this.prisma.user.findUnique({
      where: { nickname },
    });

    if (!existingUser) {
      existingUser = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          nickname,
          role:
            nickname === presentation.creatorId
              ? Role.CREATOR
              : Role.VIEWER,
        },
      });
    }

    const isAlreadyConnected = presentation.users.some(
      (u) => u.id === existingUser.id,
    );

    if (!isAlreadyConnected) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          presentations: {
            connect: { id: presentation.id },
          },
          role:
            nickname === presentation.creatorId
              ? Role.CREATOR
              : Role.VIEWER,
        },
      });
    }

    const updatedPresentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        users: true,
        slides: { include: { blocks: true } },
      },
    });

    client.join(presentationId);
    this.server
      .to(presentationId)
      .emit('presentation-data', updatedPresentation);
  }

  @SubscribeMessage('presentation-update')
  async updatePresentation(@MessageBody() presentation: any) {
    await this.prisma.slide.deleteMany({
      where: { presentationId: presentation.id },
    });

    for (const slide of presentation.slides) {
      await this.prisma.slide.create({
        data: {
          id: slide.id,
          title: slide.title,
          presentationId: presentation.id,
          blocks: {
            create: slide.blocks.map((block) => ({
              id: block.id,
              content: block.content,
              x: block.x,
              y: block.y,
              slideId: slide.id,
            })),
          },
        },
      });
    }

    this.server.to(presentation.id).emit('presentation-update', presentation);
  }

  @SubscribeMessage('change-user-role')
  async changeUserRole(
    @MessageBody()
    data: {
      userId: string;
      newRole: Role;
      presentationId: string;
    },
  ) {
    await this.prisma.user.update({
      where: { id: data.userId },
      data: { role: data.newRole },
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    this.server.to(data.presentationId).emit('user-role-changed', updatedUser);
  }
}
