/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParamStoreModule } from './param-store.module';
import { ParamStoreService } from '../service';
import {
  AWS_PARAM_STORE_OPTIONS,
  AWS_PARAM_STORE_PROVIDER,
} from '../constants';
import { ModuleAsyncOptions, ModuleOptions } from '../interface';

describe('ParamStoreModule', () => {
  describe('forRoot()', () => {
    const options: ModuleOptions = {
      awsRegion: 'us-east-1',
      awsParamStorePath: '/my/path',
      awsParamStoreContinueOnError: true,
    };
    let moduleDef: DynamicModule;

    beforeAll(() => {
      moduleDef = ParamStoreModule.forRoot(options);
    });

    it('should set the module to ParamStoreModule', () => {
      expect(moduleDef.module).toBe(ParamStoreModule);
    });

    it('should import ScheduleModule.forRoot()', () => {
      expect(moduleDef.imports).toHaveLength(1);
      const imported = moduleDef.imports![0] as DynamicModule;
      expect(imported.module).toBe(ScheduleModule);
    });

    it('should provide AWS_PARAM_STORE_OPTIONS with the exact options object', () => {
      const optsProv = (moduleDef.providers as any[]).find(
        (p) => p.provide === AWS_PARAM_STORE_OPTIONS,
      );
      expect(optsProv).toBeDefined();
      expect(optsProv.useValue).toBe(options);
    });

    it('should provide AWS_PARAM_STORE_PROVIDER factory that injects AWS_PARAM_STORE_OPTIONS and calls getSSMParameters', async () => {
      const spy = jest
        .spyOn(ParamStoreModule as any, 'getSSMParameters')
        .mockResolvedValue([{ Name: '/my/path/key', Value: 'val' }]);
      const prov = (moduleDef.providers as any[]).find(
        (p) => p.provide === AWS_PARAM_STORE_PROVIDER,
      );
      expect(prov).toBeDefined();
      expect(prov.inject).toEqual([AWS_PARAM_STORE_OPTIONS]);

      const result = await prov.useFactory(options);
      expect(spy).toHaveBeenCalledWith('us-east-1', '/my/path', true);
      expect(result).toEqual([{ Name: '/my/path/key', Value: 'val' }]);
      spy.mockRestore();
    });

    it('should include ParamStoreService in providers and exports', () => {
      expect(moduleDef.providers).toContain(ParamStoreService);
      expect(moduleDef.exports).toEqual([ParamStoreService]);
    });
  });

  describe('forRootAsync()', () => {
    const asyncOpts: ModuleAsyncOptions = {
      import: ConfigModule,
      useClass: ConfigService,
    };
    let moduleDef: DynamicModule;

    beforeAll(() => {
      moduleDef = ParamStoreModule.forRootAsync(asyncOpts);
    });

    it('should set the module to ParamStoreModule and include ConfigModule & ScheduleModule imports', () => {
      expect(moduleDef.module).toBe(ParamStoreModule);

      // now two imports: the user’s ConfigModule plus ScheduleModule.forRoot()
      expect(moduleDef.imports).toHaveLength(2);
      expect(moduleDef.imports).toContain(ConfigModule);

      const schedMod = moduleDef.imports![1] as DynamicModule;
      expect(schedMod.module).toBe(ScheduleModule);
    });

    it('should register ParamStoreService as a provider', () => {
      expect(moduleDef.providers![0]).toBe(ParamStoreService);
    });

    it('should provide AWS_PARAM_STORE_PROVIDER that injects AWS_PARAM_STORE_OPTIONS and calls getSSMParameters', async () => {
      const spy = jest
        .spyOn(ParamStoreModule as any, 'getSSMParameters')
        .mockResolvedValue([{ Name: '/foo', Value: 'bar' }]);

      const prov = (moduleDef.providers as any[]).find(
        (p) => p.provide === AWS_PARAM_STORE_PROVIDER,
      );
      expect(prov).toBeDefined();

      // now the provider injects the options token, not ConfigService
      expect(prov.inject).toEqual([AWS_PARAM_STORE_OPTIONS]);

      const fakeOptions: ModuleOptions = {
        awsRegion: 'region-1',
        awsParamStorePath: '/foo',
        awsParamStoreContinueOnError: false,
      };
      const result = await (prov.useFactory as any)(fakeOptions);

      expect(spy).toHaveBeenCalledWith('region-1', '/foo', false);
      expect(result).toEqual([{ Name: '/foo', Value: 'bar' }]);
      spy.mockRestore();
    });

    it('should export ParamStoreService', () => {
      expect(moduleDef.exports).toEqual([ParamStoreService]);
    });
  });
});
