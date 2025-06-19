import {
  DynamicModule,
  Global,
  Logger,
  Module,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AWS_PARAM_STORE_CONTINUE_ON_ERROR,
  AWS_PARAM_STORE_OPTIONS,
  AWS_PARAM_STORE_PATH,
  AWS_PARAM_STORE_PROVIDER,
  AWS_REGION,
} from '../constants';
import { ModuleAsyncOptions, ModuleOptions } from '../interface';
import { ParamStoreService } from '../service';
import {
  paginateGetParametersByPath,
  Parameter,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({})
export class ParamStoreModule {
  private static readonly LOGGER = new Logger(ParamStoreModule.name);

  public static forRoot(options: ModuleOptions): DynamicModule {
    const providers = this.createProviders(options);
    return {
      module: ParamStoreModule,
      imports: [ScheduleModule.forRoot()],
      providers: [...providers, ParamStoreService],
      exports: [ParamStoreService],
    };
  }

  public static forRootAsync(
    moduleAsyncOptions: ModuleAsyncOptions,
  ): DynamicModule {
    const asyncProviders = this.createAsyncProviders(moduleAsyncOptions);
    return {
      module: ParamStoreModule,
      imports: [moduleAsyncOptions.import, ScheduleModule.forRoot()],
      providers: [ParamStoreService, ...asyncProviders],
      exports: [ParamStoreService],
    };
  }

  public static async getSSMParameters(
    awsRegion: string,
    awsParamStorePath: string,
    continueOnError: boolean,
  ): Promise<Parameter[]> {
    const parameters: Parameter[] = [];
    try {
      const ssmClient = new SSMClient({ region: awsRegion });
      const paginator = paginateGetParametersByPath(
        { client: ssmClient },
        { Path: awsParamStorePath, Recursive: true, WithDecryption: true },
      );
      for await (const page of paginator) {
        if (page.Parameters) {
          parameters.push(...page.Parameters);
        }
      }
    } catch (error) {
      if (continueOnError) {
        this.LOGGER.error('Failed to load AWS SSM parameters', error.message);
      } else {
        throw error;
      }
    }
    return parameters;
  }

  private static createProviders(options: ModuleOptions): Provider[] {
    return [
      {
        provide: AWS_PARAM_STORE_OPTIONS,
        useValue: options,
      },
      {
        provide: AWS_PARAM_STORE_PROVIDER,
        useFactory: async (opts: ModuleOptions): Promise<Parameter[]> => {
          return await ParamStoreModule.getSSMParameters(
            opts.awsRegion,
            opts.awsParamStorePath,
            opts.awsParamStoreContinueOnError
              ? opts.awsParamStoreContinueOnError
              : false,
          );
        },
        inject: [AWS_PARAM_STORE_OPTIONS],
      },
    ];
  }

  private static createAsyncProviders(
    moduleAsyncOptions: ModuleAsyncOptions,
  ): Provider[] {
    return [
      {
        provide: AWS_PARAM_STORE_OPTIONS,
        useFactory: (configService: ConfigService): ModuleOptions => ({
          awsRegion: configService.get(AWS_REGION),
          awsParamStorePath: configService.get(AWS_PARAM_STORE_PATH),
          awsParamStoreContinueOnError: configService.get<boolean>(
            AWS_PARAM_STORE_CONTINUE_ON_ERROR,
            false,
          ),
        }),
        inject: [moduleAsyncOptions.useClass],
      },
      {
        provide: AWS_PARAM_STORE_PROVIDER,
        useFactory: (opts: ModuleOptions): Promise<Parameter[]> =>
          ParamStoreModule.getSSMParameters(
            opts.awsRegion,
            opts.awsParamStorePath,
            opts.awsParamStoreContinueOnError ?? false,
          ),
        inject: [AWS_PARAM_STORE_OPTIONS],
      },
    ];
  }
}
