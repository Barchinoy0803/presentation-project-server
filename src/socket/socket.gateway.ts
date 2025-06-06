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
    @MessageBody() data: { nickname: string; presentationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { nickname, presentationId } = data;

    const presentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { users: true, slides: { include: { blocks: true } } },
    });

    if (!presentation) {
      client.emit('error', 'Presentation not found');
      return;
    }

    let user = await this.prisma.user.findUnique({ where: { nickname } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          nickname,
          role: nickname === presentation.creatorId ? Role.CREATOR : Role.VIEWER,
        },
      });
    }

    const isConnected = presentation.users.some((u) => u.id === user.id);

    if (!isConnected) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          presentations: { connect: { id: presentationId } },
          role: nickname === presentation.creatorId ? Role.CREATOR : Role.VIEWER,
        },
      });
    }

    const updatedPresentation = await this.prisma.presentation.findUnique({
      where: { id: presentationId },
      include: { users: true, slides: { include: { blocks: true } } },
    });

    client.join(presentationId);
    this.server.to(presentationId).emit('presentation-data', updatedPresentation);
  }

  @SubscribeMessage('add-slide')
  async addSlide(
    @MessageBody()
    data: { presentationId: string; slide: { id: string; title: string; blocks: any[] } },
  ) {
    await this.prisma.slide.create({
      data: {
        id: data.slide.id,
        title: data.slide.title,
        presentationId: data.presentationId,
        blocks: {
          create: data.slide.blocks.map((b) => ({
            id: b.id,
            content: b.content,
            x: b.x,
            y: b.y,
          })),
        },
      },
    });

    const updatedPresentation = await this.prisma.presentation.findUnique({
      where: { id: data.presentationId },
      include: { users: true, slides: { include: { blocks: true } } },
    });

    this.server.to(data.presentationId).emit('presentation-update', updatedPresentation);
  }

  @SubscribeMessage('update-slide')
  async updateSlide(
    @MessageBody()
    data: { presentationId: string; slide: { id: string; title: string; blocks: any[] } },
  ) {
    await this.prisma.textBlock.deleteMany({
      where: { slideId: data.slide.id },
    });

    await this.prisma.slide.update({
      where: { id: data.slide.id },
      data: {
        title: data.slide.title,
        blocks: {
          create: data.slide.blocks.map((b) => ({
            id: b.id,
            content: b.content,
            x: b.x,
            y: b.y,
          })),
        },
      },
    });

    const updatedPresentation = await this.prisma.presentation.findUnique({
      where: { id: data.presentationId },
      include: { users: true, slides: { include: { blocks: true } } },
    });

    this.server.to(data.presentationId).emit('presentation-update', updatedPresentation);
  }

  @SubscribeMessage('remove-slide')
  async removeSlide(
    @MessageBody() data: { presentationId: string; slideId: string },
  ) {
    await this.prisma.slide.delete({ where: { id: data.slideId } });

    const updatedPresentation = await this.prisma.presentation.findUnique({
      where: { id: data.presentationId },
      include: { users: true, slides: { include: { blocks: true } } },
    });

    this.server.to(data.presentationId).emit('presentation-update', updatedPresentation);
  }

  @SubscribeMessage('change-user-role')
  async changeUserRole(
    @MessageBody() data: { userId: string; newRole: Role; presentationId: string },
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
