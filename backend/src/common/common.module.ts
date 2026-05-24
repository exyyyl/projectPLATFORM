import { Global, Module } from '@nestjs/common';

/**
 * Общие guards, pipes, filters — экспортируются глобально по мере реализации.
 */
@Global()
@Module({})
export class CommonModule {}
