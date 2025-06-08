import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PresentationModule } from './presentation/presentation.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [PrismaModule, PresentationModule, SocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
