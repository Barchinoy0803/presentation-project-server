import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
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
    @MessageBody() data: { user: { id: string; nickname: string }; presentationId: string },
  ) {
    const { user, presentationId } = data;

    // Qidirilayotgan presentation
    let presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: {
        users: true,
        slides: {
          include: { blocks: true },
        },
      },
    });

    // Agar presentation topilmasa — yaratish
    if (!presentation) {
      presentation = await this.prisma.presentation.create({
        data: {
          id: presentationId,
          creatorId: user.id,
          users: {
            create: {
              id: user.id,
              nickname: user.nickname,
              role: Role.CREATER,
            },
          },
          slides: {
            create: {
              id: uuidv4(),
              title: 'First Slide',
              blocks: {
                create: [],
              },
            },
          },
        },
        include: {
          users: true,
          slides: {
            include: { blocks: true },
          },
        },
      });
    } else {
      // Foydalanuvchi allaqachon ulanganmi, yo‘qmi
      const existingUser = presentation.users.find((u) => u.id === user.id);

      if (!existingUser) {
        await this.prisma.user.create({
          data: {
            id: user.id,
            nickname: user.nickname,
            role: Role.VIEWER,
            presentationId: presentation.id,
          },
        });

        // Yangilangan presentation-ni qayta olish
        presentation = await this.prisma.presentation.findUnique({
          where: { id: presentationId },
          include: {
            users: true,
            slides: {
              include: { blocks: true },
            },
          },
        });
      }
    }

    // Foydalanuvchini socket room-ga qo‘shish
    const sockets = await this.server.fetchSockets();
    const clientSocket = sockets.find((s) => s.handshake.auth.userId === user.id);
    if (clientSocket) {
      clientSocket.join(presentationId);
    }

    this.server.to(presentationId).emit('presentation-data', presentation);
  }

  @SubscribeMessage('update-presentation')
  async updatePresentation(@MessageBody() presentation: any) {
    await this.prisma.presentation.update({
      where: { id: presentation.id },
      data: {
        slides: {
          deleteMany: {}, // eski slaydlarni o‘chiradi
          create: presentation.slides.map((slide) => ({
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
          })),
        },
      },
    });

    this.server.to(presentation.id).emit('presentation-update', presentation);
  }

  @SubscribeMessage('change-user-role')
  async changeUserRole(
    @MessageBody() data: {
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
