import { ParamStoreService } from './param-store.service';
import { ModuleOptions } from '../interface';
import {
  paginateGetParametersByPath,
  Parameter,
  SSMClient,
} from '@aws-sdk/client-ssm';

jest.mock('@aws-sdk/client-ssm');

describe('ParamStoreService', () => {
  let service: ParamStoreService;
  const initialParams: Parameter[] = [
    { Name: '/app/foo', Value: 'foo-value' },
    { Name: '/app/bar', Value: '123' },
    { Name: '/app/baz', Value: 'true' },
    { Name: '/app/qux', Value: '{"x":1,"y":2}' },
  ];

  const baseOptions: ModuleOptions = {
    awsRegion: 'us-east-1',
    awsParamStorePath: '/app',
    awsParamStoreContinueOnError: false,
  };

  beforeEach(() => {
    // reset mocks
    (paginateGetParametersByPath as jest.Mock).mockReset();
    (SSMClient as jest.Mock).mockReset();
    service = new ParamStoreService(initialParams, baseOptions);
  });

  describe('get()', () => {
    it('returns existing value', () => {
      expect(service.get('foo')).toBe('foo-value');
    });

    it('returns default if key missing and default provided', () => {
      expect(service.get('nope', 'def')).toBe('def');
    });

    it('throws if key missing and no default', () => {
      expect(() => service.get('nope')).toThrow(`Parameter "nope" not found`);
    });
  });

  describe('getAsNumber()', () => {
    it('parses a number string', () => {
      expect(service.getAsNumber('bar')).toBe(123);
    });

    it('uses default number if missing', () => {
      expect(service.getAsNumber('nope', 42)).toBe(42);
    });

    it('throws if value is not a number', () => {
      expect(() => service.getAsNumber('foo')).toThrow(
        `Parameter value "foo" is not a number`,
      );
    });
  });

  describe('getBoolean()', () => {
    it('parses "true" and "false"', () => {
      expect(service.getBoolean('baz')).toBe(true);
      // override value to "false"
      const svc = new ParamStoreService(
        [{ Name: '/app/baz', Value: 'false' }],
        baseOptions,
      );
      expect(svc.getBoolean('baz')).toBe(false);
    });

    it('uses default boolean if missing', () => {
      expect(service.getBoolean('nope', true)).toBe(true);
    });

    it('throws if not a boolean string', () => {
      expect(() => service.getBoolean('bar')).toThrow(
        `Parameter value "bar" is not a boolean`,
      );
    });
  });

  describe('getJson()', () => {
    it('returns parsed JSON', () => {
      const obj = service.getJson<{ x: number; y: number }>('qux');
      expect(obj).toEqual({ x: 1, y: 2 });
    });

    it('throws if invalid JSON', () => {
      const badSvc = new ParamStoreService(
        [{ Name: '/app/bad', Value: 'not json' }],
        baseOptions,
      );
      expect(() => badSvc.getJson('bad')).toThrow(
        `Parameter value "bad" contains invalid JSON`,
      );
    });
  });

  describe('getOrDefault()', () => {
    it('returns parsed JSON when valid', () => {
      expect(service.getOrDefault('qux', { x: 0 })).toEqual({ x: 1, y: 2 });
    });

    it('returns fallback when JSON invalid', () => {
      const badSvc = new ParamStoreService(
        [{ Name: '/app/bad', Value: 'nope' }],
        baseOptions,
      );
      expect(badSvc.getOrDefault('bad', { foo: true })).toEqual({
        foo: true,
      });
    });
  });

  describe('refresh()', () => {
    const pages = [
      { Parameters: [{ Name: '/app/alpha', Value: 'A' }] },
      { Parameters: [{ Name: '/app/beta', Value: 'B' }] },
    ];

    it('reloads parameters on success', async () => {
      // mock an async iterator over our pages
      (paginateGetParametersByPath as jest.Mock).mockReturnValue(
        (async function* () {
          for (const p of pages) yield p;
        })(),
      );

      await service.refresh();
      expect(service.get('alpha')).toBe('A');
      expect(service.get('beta')).toBe('B');
    });

    it('throws on error when continueOnError is false', async () => {
      (paginateGetParametersByPath as jest.Mock).mockImplementation(() => {
        throw new Error('SSM failure');
      });

      await expect(service.refresh()).rejects.toThrow('SSM failure');
    });

    it('swallows error when continueOnError is true', async () => {
      const opts = { ...baseOptions, awsParamStoreContinueOnError: true };
      const svc = new ParamStoreService(initialParams, opts);

      (paginateGetParametersByPath as jest.Mock).mockImplementation(() => {
        throw new Error('SSM boom');
      });

      await expect(svc.refresh()).resolves.toBeUndefined();
      // original values remain
      expect(svc.get('foo')).toBe('foo-value');
    });
  });
});
