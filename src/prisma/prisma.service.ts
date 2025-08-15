import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // Runs when the NestJS module starts
  async onModuleInit() {
    await this.$connect();
  }

  // Runs when the NestJS module stops
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
