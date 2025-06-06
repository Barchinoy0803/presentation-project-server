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
  private connectedClients = new Map<string, Socket>();

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-presentation')
  async joinPresentation(
    @MessageBody() { nickname, presentationId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const presentation = await this.prisma.presentation.findUnique({
        where: { id: presentationId },
        include: {
          users: true,
          slides: { include: { blocks: true } },
        },
      });

      if (!presentation) {
        return client.emit('error', 'Presentation not found');
      }

      let user = await this.prisma.user.findUnique({
        where: { nickname },
      });

      const isAlreadyConnected = presentation.users.some(
        (u) => u.nickname === nickname,
      );

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: uuidv4(),
            nickname,
            role: Role.VIEWER,
          },
        });
      }

      if (!isAlreadyConnected) {
        await this.prisma.presentation.update({
          where: { id: presentationId },
          data: {
            users: {
              connect: { id: user.id },
            },
          },
        });
      }

      const creator = await this.prisma.user.findUnique({
        where: { id: presentation.creatorId },
      });

      if (nickname === creator?.nickname && user.role !== Role.CREATOR) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.CREATOR },
        });
      }

      client.join(presentationId);
      client.emit('presentation-data', {
        ...presentation,
        users: [...presentation.users, user].filter(
          (u, i, arr) => arr.findIndex((u2) => u2.id === u.id) === i,
        ),
      });
    } catch (error) {
      client.emit('error', 'Failed to join presentation');
      console.error('Join presentation error:', error);
    }
  }

  @SubscribeMessage('add-slide')
  async addSlide(
    @MessageBody() { presentationId, slide },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const newSlide = await this.prisma.slide.create({
        data: {
          id: slide.id,
          title: slide.title,
          presentationId,
        },
      });

      this.server.to(presentationId).emit('slide-added', newSlide);
    } catch (error) {
      client.emit('error', 'Failed to add slide');
      console.error('Add slide error:', error);
    }
  }

  @SubscribeMessage('update-block')
  async updateBlock(
    @MessageBody() { presentationId, block, slideId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.prisma.textBlock.update({
        where: { id: block.id },
        data: {
          content: block.content,
          x: block.x,
          y: block.y,
        },
      });

      // Broadcast to all except sender
      client.to(presentationId).emit('block-updated', { slideId, block });
    } catch (error) {
      client.emit('error', 'Failed to update block');
      console.error('Update block error:', error);
    }
  }

  @SubscribeMessage('add-block')
  async addBlock(
    @MessageBody() { presentationId, block, slideId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const newBlock = await this.prisma.textBlock.create({
        data: {
          ...block,
          slideId,
        },
      });

      this.server
        .to(presentationId)
        .emit('block-added', { slideId, block: newBlock });
    } catch (error) {
      client.emit('error', 'Failed to add block');
      console.error('Add block error:', error);
    }
  }

  @SubscribeMessage('remove-block')
  async removeBlock(
    @MessageBody() { presentationId, blockId, slideId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.prisma.textBlock.delete({
        where: { id: blockId },
      });

      this.server
        .to(presentationId)
        .emit('block-removed', { slideId, blockId });
    } catch (error) {
      client.emit('error', 'Failed to remove block');
      console.error('Remove block error:', error);
    }
  }

  @SubscribeMessage('remove-slide')
  async removeSlide(
    @MessageBody() { presentationId, slideId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.prisma.textBlock.deleteMany({
        where: { slideId },
      });

      await this.prisma.slide.delete({
        where: { id: slideId },
      });

      this.server.to(presentationId).emit('slide-removed', slideId);
    } catch (error) {
      client.emit('error', 'Failed to remove slide');
      console.error('Remove slide error:', error);
    }
  }

  @SubscribeMessage('change-user-role')
  async changeUserRole(
    @MessageBody() { userId, newRole, presentationId },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
      });

      this.server.to(presentationId).emit('user-role-changed', updatedUser);
    } catch (error) {
      client.emit('error', 'Failed to change user role');
      console.error('Change user role error:', error);
    }
  }

  @SubscribeMessage('navigate-slide')
  async navigateSlide(
    @MessageBody() { presentationId, slideId },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(presentationId).emit('slide-navigated', slideId);
  }
}
