import { Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export interface ModuleAsyncOptions {
  import: Type<ConfigModule>;
  useClass: Type<ConfigService>;
}
