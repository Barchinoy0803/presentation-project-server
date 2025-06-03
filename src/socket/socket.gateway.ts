import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Role } from 'generated/prisma';

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
    @MessageBody() data: {
      user: { id: string; nickname: string; role: string; presentationId: string };
      presentationId: string;
      title: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { user, presentationId, title } = data;
    
    console.log(presentationId);

    let presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId ?? '0'},
      include: {
        users: true,
        slides: { include: { blocks: true } },
      },
    });

    let existingUser = await this.prisma.user.findUnique({
      where: { nickname: user.nickname },
    });

    if (!existingUser) {
      existingUser = await this.prisma.user.create({
        data: {
          id: user.id,
          nickname: user.nickname,
          role: Role.VIEWER, 
        },
      });
    }
    
    if (!presentation) {
      
      presentation = await this.prisma.presentation.create({
        data: {
          creatorId: existingUser.id,
          title,
          users: {
            connect: { id: existingUser.id },
          },
          slides: {
            create: {
              id: uuidv4(),
              title: 'First Slide',
              blocks: { create: [] },
            },
          },
        },
        include: {
          users: true,
          slides: { include: { blocks: true } },
        },
      });
    } else {
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
          },
        });

        presentation = await this.prisma.presentation.findUnique({
          where: { id: presentationId },
          include: {
            users: true,
            slides: { include: { blocks: true } },
          },
        });
      }
    }

    client.join(presentationId);
    this.server.to(presentationId).emit('presentation-data', presentation);
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
