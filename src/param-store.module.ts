import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AWS_PARAM_STORE_CONTINUE_ON_ERROR,
  AWS_PARAM_STORE_PATH,
  AWS_PARAM_STORE_PROVIDER,
  AWS_REGION,
} from './constants';
import { ModuleAsyncOptions, ModuleOptions } from './interface';
import { ParamStoreService } from './param-store.service';
import {
  GetParametersByPathCommand,
  Parameter,
  SSMClient,
} from '@aws-sdk/client-ssm';

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
          return await ParamStoreModule.getSSMParameters(
            moduleOptions.awsRegion,
            moduleOptions.awsParamSorePath,
            moduleOptions.awsParamStoreContinueOnError
              ? moduleOptions.awsParamStoreContinueOnError
              : false,
          );
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
          return await ParamStoreModule.getSSMParameters(
            configService.get(AWS_REGION),
            configService.get(AWS_PARAM_STORE_PATH),
            configService.get(AWS_PARAM_STORE_CONTINUE_ON_ERROR)
              ? configService.get(AWS_PARAM_STORE_CONTINUE_ON_ERROR)
              : false,
          );
        },
        inject: [moduleAsyncOptions.useClass],
      },
    ];
  }

  private static async getSSMParameters(
    awsRegion: string,
    awsParamSorePath: string,
    continueOnError: boolean,
  ): Promise<Parameter[]> {
    const parameters = [];
    try {
      let nextToken = null;
      let result = null;
      let areMoreParametersToFetch = true;
      const clientConfiguration = { region: awsRegion };
      const ssmClient = new SSMClient(clientConfiguration);
      while (areMoreParametersToFetch) {
        const commandInput = {
          Path: awsParamSorePath,
          Recursive: true,
          WithDecryption: true,
        };
        if (nextToken) {
          commandInput['NextToken'] = nextToken;
        }
        const getParametersByPathCommand = new GetParametersByPathCommand(
          commandInput,
        );
        result = await ssmClient.send(getParametersByPathCommand);
        parameters.push(...(result ? result.Parameters : undefined));
        nextToken = result.NextToken;
        areMoreParametersToFetch = !!nextToken;
      }
    } catch (error) {
      if (continueOnError) {
        console.log('Error while fetching AWS parameters: ', error.message);
      } else {
        throw error;
      }
    }
    return parameters;
  }
}
