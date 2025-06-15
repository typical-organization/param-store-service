# AWS Parameter Store Service (NestJS) [![NPM](https://github.com/typical-organization/param-store-service/actions/workflows/main.yml/badge.svg)](https://github.com/typical-organization/param-store-service/actions/workflows/main.yml)

A NestJS module and service for loading and caching parameters from AWS Systems Manager Parameter Store (SSM). Supports
synchronous and asynchronous configuration, automatic type parsing, and manual refresh.

We can use "@nestjs/config" config service to read parameters from file and environment variables.
And use paramStoreService to read environment specific parameters like password or endpoint URL on application start up.

Module exports 'ParamStoreService' to access downloaded parameters.
Service has method 'get' to read property.

## Table of Contents

- [Installation](#installation)
- [Configuration](#Configuration)
    - [Synchronous Configuration](#Synchronous-Configuration)
    - [Asynchronous Configuration](#asynchronous-configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [Author](#Author)
- [License](#license)

## Installation

Install the package via npm or yarn:

### Using npm

```bash
  npm install @your-org/param-store-service
````

### Using yarn

```bash
  yarn add @your-org/param-store-service
```

## Configuration

### Synchronous Configuration

Import the module with static options in your root module:

```typescript
import { Module } from '@nestjs/common';
import { ParamStoreModule } from '@your-org/param-store-service';

@Module({
  imports: [
    ParamStoreModule.forRoot({
      awsRegion: 'us-east-1',                  // AWS region
      awsParamStorePath: '/my/app/config',     // SSM path prefix
      awsParamStoreContinueOnError: false,     // Throw or swallow errors
    }),
  ],
})
export class AppModule {
}

```

### Asynchronous Configuration

Use Nest’s ConfigModule (or another dynamic provider) to supply options at runtime:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParamStoreModule } from '@your-org/param-store-service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ParamStoreModule.forRootAsync({
      imports: [ConfigModule],
      useClass: ConfigService, // reads awsRegion, awsParamStorePath, etc. from ConfigService.get()
    }),
  ],
})
export class AppModule {
}
```

## Usage

Inject and use the service in your components:

```typescript
import { Injectable } from '@nestjs/common';
import { ParamStoreService } from '@your-org/param-store-service';

@Injectable()
export class MyService {
  constructor(private readonly params: ParamStoreService) {
  }

  getFoo(): string {
    return this.params.get('foo'); // throws if missing
  }

  getCount(): number {
    return this.params.getAsNumber('counter', 0); // default 0 if missing
  }

  isEnabled(): boolean {
    return this.params.getBoolean('featureEnabled', false);
  }

  getComplex(): Record<string, any> {
    return this.params.getJson('complexConfig');
  }

  async reloadParams(): Promise<void> {
    await this.params.refresh();
  }
}
```

## API Reference

### ModuleOptions

```typescript
export interface ModuleOptions {
  awsRegion: string;
  awsParamStorePath: string;
  awsParamStoreContinueOnError: boolean;
}
```

### ModuleAsyncOptions

```typescript
export interface ModuleAsyncOptions {
  imports?: any[];
  useClass: Type<ConfigService>;
}
```

### ParamStoreService

| Method       | Signature                                      | Description                                                                |
|--------------|------------------------------------------------|----------------------------------------------------------------------------|
| get          | (key: string, defaultValue?: string): string   | Get a string parameter. Throws if missing and no default provided.         |
| getAsNumber  | (key: string, defaultValue?: number): number   | Parse a parameter as a number. Throws on invalid parse.                    |
| getBoolean   | (key: string, defaultValue?: boolean): boolean | Parse "true"/"false". Throws on invalid parse.                             |
| getJson      | <T>(key: string): T                            | Parse a parameter value as JSON. Throws on invalid JSON.                   |
| getOrDefault | <T>(key: string, defaultValue: T): T           | Parse JSON or return the provided default if parsing fails.                |
| refresh      | (): Promise<void>                              | Reload all parameters from AWS SSM. Respects awsParamStoreContinueOnError. |

## Error Handling

- Missing key without a default:
  > Error: Parameter "<key>" not found
- Invalid number parse:
  > Error: Parameter value "<key>" is not a number
- Invalid boolean parse:
  > Error: Parameter value "<key>" is not a boolean
- Invalid JSON:
  > Error: Parameter value "<key>" contains invalid JSON
- refresh() errors are either re-thrown or swallowed based on your awsParamStoreContinueOnError setting.

## Contributing

- Fork the repository
- Clone your fork
- Install dependencies
- Make your changes
- Run tests
- Submit a pull request

## Author

**PM**

## License

Licensed under the MIT License.