import { Inject, Injectable } from '@nestjs/common';
import { Parameter } from 'aws-sdk/clients/ssm';
import { AWS_PARAM_STORE_PROVIDER } from './constants';
import { ParamStoreParameters } from './interface';

@Injectable()
export class ParamStoreService {
  private readonly _paramStoreParameters: ParamStoreParameters;

  constructor(@Inject(AWS_PARAM_STORE_PROVIDER) awsParameters: Parameter[]) {
    this._paramStoreParameters = {};
    awsParameters.forEach((parameter) => {
      const parameterPathTokens = parameter.Name.split('/');
      this._paramStoreParameters[
        parameterPathTokens[parameterPathTokens.length - 1]
      ] = parameter.Value;
    });
  }

  get(key: string): string {
    return this._paramStoreParameters[key];
  }

  getAsNumber(key: string): number {
    return +this._paramStoreParameters[key];
  }
}
