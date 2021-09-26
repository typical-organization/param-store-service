import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SSM } from 'aws-sdk';
import { Parameter } from 'aws-sdk/clients/ssm';
import {
  AWS_PARAM_STORE_PATH,
  AWS_PARAM_STORE_PROVIDER,
  AWS_REGION,
} from './constants';
import { ModuleAsyncOptions, ModuleOptions } from './interface';
import { ParamStoreService } from './param-store.service';

@Global()
@Module({})
export class ParamStoreModule {
  public static register(moduleOptions: ModuleOptions): DynamicModule {
    return {
      module: ParamStoreModule,
      providers: [ParamStoreService, ...this.createProviders(moduleOptions)],
      exports: [ParamStoreService],
    };
  }

  public static registerAsync(
    moduleAsyncOptions: ModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: ParamStoreModule,
      providers: [
        ParamStoreService,
        ...this.createAsyncProviders(moduleAsyncOptions),
      ],
      exports: [ParamStoreService],
    };
  }

  private static createProviders(moduleOptions: ModuleOptions): Provider[] {
    return [
      {
        provide: AWS_PARAM_STORE_PROVIDER,
        useFactory: async (): Promise<Parameter[]> => {
          const ssmClient = new SSM({
            region: moduleOptions.awsRegion,
          });
          const result = await ssmClient
            .getParametersByPath({
              Path: moduleOptions.awsParamSorePath,
              Recursive: true,
            })
            .promise();
          return result?.Parameters;
        },
      },
    ];
  }

  private static createAsyncProviders(
    moduleAsyncOptions: ModuleAsyncOptions,
  ): Provider[] {
    return [
      {
        provide: AWS_PARAM_STORE_PROVIDER,
        useFactory: async (
          configService: ConfigService,
        ): Promise<Parameter[]> => {
          const ssmClient = new SSM({
            region: configService.get(AWS_REGION),
          });
          const result = await ssmClient
            .getParametersByPath({
              Path: configService.get(AWS_PARAM_STORE_PATH),
              Recursive: true,
            })
            .promise();
          return result?.Parameters;
        },
        inject: [moduleAsyncOptions.useClass],
      },
    ];
  }
}
