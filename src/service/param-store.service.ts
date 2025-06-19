import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AWS_PARAM_STORE_OPTIONS,
  AWS_PARAM_STORE_PROVIDER,
} from '../constants';
import { ModuleOptions } from '../interface';
import {
  paginateGetParametersByPath,
  Parameter,
  SSMClient,
} from '@aws-sdk/client-ssm';

@Injectable()
export class ParamStoreService {
  private static readonly LOGGER = new Logger(ParamStoreService.name);
  private paramStoreParameters: Record<string, string>;
  private readonly ssmClient: SSMClient;
  private readonly path: string;
  private readonly continueOnError: boolean;
  private isRefreshing: boolean;

  constructor(
    @Inject(AWS_PARAM_STORE_PROVIDER) awsParameters: Parameter[],
    @Inject(AWS_PARAM_STORE_OPTIONS) private readonly options: ModuleOptions,
  ) {
    this.paramStoreParameters = {};
    this.ssmClient = new SSMClient({ region: options.awsRegion });
    this.path = options.awsParamStorePath;
    this.continueOnError = options.awsParamStoreContinueOnError ?? false;
    this.isRefreshing = false;
    this.loadParameters(awsParameters);
  }

  /** Retrieve a string parameter; throw if missing and no default provided */
  get(key: string, defaultValue?: string): string {
    const parameter = this.paramStoreParameters[key];
    if (parameter === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Parameter "${key}" not found`);
    }
    return parameter;
  }

  /** Parse as number */
  getAsNumber(key: string, defaultValue?: number): number {
    const str = this.get(
      key,
      defaultValue !== undefined ? String(defaultValue) : undefined,
    );
    const num = Number(str);
    if (Number.isNaN(num)) {
      throw new Error(`Parameter value "${key}" is not a number`);
    }
    return num;
  }

  /** Parse as boolean */
  getBoolean(key: string, defaultValue?: boolean): boolean {
    const str = this.get(
      key,
      defaultValue !== undefined ? String(defaultValue) : undefined,
    ).toLowerCase();
    if (str === 'true' || str === 'false') {
      return str === 'true';
    }
    throw new Error(`Parameter value "${key}" is not a boolean`);
  }

  /** Parse as JSON */
  getJson<T>(key: string, defaultValue?: T): T {
    const jsonStr = this.get(
      key,
      defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined,
    );
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new Error(`Parameter value "${key}" contains invalid JSON`);
    }
  }

  /** Return JSON‐parsed value or fallback if missing/invalid */
  getOrDefault<T>(key: string, fallback: T): T {
    try {
      return this.getJson<T>(key, fallback);
    } catch {
      return fallback;
    }
  }

  public async refresh(): Promise<void> {
    if (this.isRefreshing) {
      ParamStoreService.LOGGER.warn('Refresh already in progress, skipping.');
      return;
    }
    this.isRefreshing = true;
    try {
      const parameters: Parameter[] = [];
      const paginator = paginateGetParametersByPath(
        { client: this.ssmClient },
        { Path: this.path, Recursive: true, WithDecryption: true },
      );
      for await (const page of paginator) {
        if (page.Parameters) {
          parameters.push(...page.Parameters);
        }
      }
      this.loadParameters(parameters);
    } catch (error) {
      if (this.continueOnError) {
        ParamStoreService.LOGGER.error(
          'Parameter refresh failed: ',
          error.message,
        );
      } else {
        throw error;
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  private loadParameters(parameters: Parameter[]) {
    this.paramStoreParameters = {};
    parameters.forEach((parameter) => {
      const key = parameter.Name.split('/').pop()!;
      this.paramStoreParameters[key] = parameter.Value;
    });
  }
}
