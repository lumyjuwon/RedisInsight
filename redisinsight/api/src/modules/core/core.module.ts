import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlainEncryptionStrategy } from 'src/modules/core/encryption/strategies/plain-encryption.strategy';
import { EncryptionService } from 'src/modules/core/encryption/encryption.service';
import { KeytarEncryptionStrategy } from 'src/modules/core/encryption/strategies/keytar-encryption.strategy';
import { ServerEntity } from 'src/modules/core/models/server.entity';
import { SettingsModule } from 'src/modules/settings/settings.module';
import serverOnPremiseFactory from './providers/server-on-premise';
import { RedisService } from './services/redis/redis.service';
import { AnalyticsService } from './services/analytics/analytics.service';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { DatabaseModule } from 'src/modules/database/database.module';

interface IModuleOptions {
  buildType: string;
}

/**
 * Core module
 */
@Global()
@Module({})
export class CoreModule {
  static register(options: IModuleOptions): DynamicModule {
    // TODO: use different module configurations depending on buildType
    return {
      module: CoreModule,
      imports: [
        TypeOrmModule.forFeature([
          ServerEntity,
        ]),
        SettingsModule.register(),
        CertificateModule,
        DatabaseModule,
      ],
      providers: [
        serverOnPremiseFactory,
        KeytarEncryptionStrategy,
        PlainEncryptionStrategy,
        EncryptionService,
        AnalyticsService,
        RedisService,
      ],
      exports: [
        SettingsModule,
        CertificateModule,
        DatabaseModule,
        serverOnPremiseFactory,
        EncryptionService,
        AnalyticsService,
        RedisService,
      ],
    };
  }
}
