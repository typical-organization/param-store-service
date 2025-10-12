# Project Analysis: NestJS AWS SSM Parameter Store Service

**Analysis Date:** October 12, 2025  
**Project Version:** 2.2.2  
**Analyzed By:** Code Review Assistant

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Technical Architecture](#technical-architecture)
4. [Current Functionality](#current-functionality)
5. [Improvement Recommendations](#improvement-recommendations)
6. [Priority Matrix](#priority-matrix)

---

## Executive Summary

This is a well-structured NestJS module that provides AWS Systems Manager Parameter Store integration. The module fetches configuration parameters at application startup and caches them for efficient runtime access. While the core functionality is solid, there are opportunities for improvement in testing, error handling, documentation, and feature enhancements.

**Key Strengths:**
- Clean, modular architecture following NestJS best practices
- Support for both synchronous and asynchronous configuration
- Handles AWS pagination automatically
- Published as an npm package with proper metadata

**Key Areas for Improvement:**
- No unit tests currently exist
- Missing comprehensive error handling and logging
- Contains a typo in variable naming (`awsParamSorePath` → `awsParamStorePath`)
- Limited CI/CD pipeline (only publishes on release)

---

## Project Overview

### Purpose
A reusable NestJS module that simplifies AWS Systems Manager Parameter Store integration by:
- Fetching parameters from AWS SSM at application startup
- Caching parameters in memory for fast access
- Providing a simple service interface for parameter retrieval

### Technology Stack
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.5.4
- **AWS SDK:** @aws-sdk/client-ssm ^3.658.1
- **Build Tool:** TypeScript Compiler (tsc)
- **Linting:** ESLint 9.x with TypeScript support
- **Testing Framework:** Jest 29.x (configured but no tests present)

### Package Information
- **Name:** param-store-service
- **Repository:** https://github.com/typical-organization/param-store-service
- **License:** MIT
- **Distribution:** npm public registry

---

## Technical Architecture

### Module Structure

```
param-store-service/
├── src/
│   ├── constants.ts                 # Provider and config key constants
│   ├── index.ts                     # Public API exports
│   ├── param-store.module.ts        # Main module with registration logic
│   ├── param-store.service.ts       # Service for parameter access
│   └── interface/
│       ├── index.ts
│       ├── module-async-options.interface.ts
│       ├── module-options.interface.ts
│       └── param-store-parameters.interface.ts
├── dist/                            # Compiled JavaScript output
└── [configuration files]
```

### Core Components

#### 1. ParamStoreModule (`src/param-store.module.ts`)

**Responsibilities:**
- Module registration (static and async)
- AWS SSM client initialization
- Parameter fetching with pagination support
- Error handling during initialization

**Key Methods:**
- `register(moduleOptions: ModuleOptions)` - Static configuration
- `registerAsync(moduleAsyncOptions: ModuleAsyncOptions)` - Async with ConfigService
- `getSSMParameters()` - Private method that fetches parameters from AWS

**Implementation Details:**
```typescript
// Fetches ALL parameters recursively from the specified path
// Handles AWS pagination automatically
// Supports WithDecryption for secure parameters
// Optional continueOnError flag to prevent app crashes
```

#### 2. ParamStoreService (`src/param-store.service.ts`)

**Responsibilities:**
- Store fetched parameters in a key-value map
- Provide accessor methods for parameter retrieval
- Transform parameter names by stripping path prefix

**Key Methods:**
- `get(key: string): string` - Retrieve string value
- `getAsNumber(key: string): number` - Retrieve numeric value

**Parameter Name Transformation:**
```typescript
// Input: /application/config/database/host
// Stored as: "host" (only last segment kept)
```

#### 3. Interfaces

**ModuleOptions** - Static configuration:
```typescript
{
  awsRegion: string;
  awsParamSorePath: string;  // TYPO: should be awsParamStorePath
  awsParamStoreContinueOnError: boolean;
}
```

**ModuleAsyncOptions** - Async configuration:
```typescript
{
  import: Type<ConfigModule>;
  useClass: Type<ConfigService>;
}
```

**ParamStoreParameters** - Internal storage:
```typescript
{
  [key: string]: string;
}
```

---

## Current Functionality

### 1. Configuration Methods

#### Static Registration
```typescript
ParamStoreModule.register({
  awsRegion: 'us-east-1',
  awsParamSorePath: '/application/config',
  awsParamStoreContinueOnError: false
})
```

#### Async Registration with ConfigService
```typescript
ParamStoreModule.registerAsync({
  import: ConfigModule,
  useClass: ConfigService,
})
```

### 2. Parameter Retrieval

```typescript
// String retrieval
const dbHost = paramStoreService.get('database-host');

// Numeric retrieval
const port = paramStoreService.getAsNumber('port');
```

### 3. AWS Integration Features

- **Recursive Parameter Fetching:** Retrieves all parameters under the specified path
- **Automatic Pagination:** Handles AWS's NextToken pagination transparently
- **Decryption Support:** Automatically decrypts SecureString parameters
- **Region Configuration:** Supports any AWS region

### 4. Error Handling

- **Default Behavior:** Throws errors and prevents app startup if parameter fetch fails
- **Optional Behavior:** With `continueOnError: true`, logs error and continues with empty parameters

---

## Improvement Recommendations

### Category 1: Critical Issues 🔴

#### 1.1 Fix Variable Name Typo
**Issue:** `awsParamSorePath` should be `awsParamStorePath`  
**Impact:** Confusing for developers, inconsistent naming  
**Files Affected:**
- `src/interface/module-options.interface.ts` (line 3)
- `src/param-store.module.ts` (lines 48, 82, 94)
- `README.md` (documentation)

**Recommendation:**
```typescript
// Change all occurrences from:
awsParamSorePath: string;

// To:
awsParamStorePath: string;
```

#### 1.2 Add Unit Tests
**Issue:** No tests exist despite Jest configuration  
**Impact:** No automated quality assurance, difficult to refactor safely  
**Test Coverage Needed:**
- Parameter fetching logic
- Service get/getAsNumber methods
- Error handling scenarios
- Pagination logic
- Parameter name transformation

**Recommendation:**
Create test files:
- `src/param-store.service.spec.ts`
- `src/param-store.module.spec.ts`

Example test structure:
```typescript
describe('ParamStoreService', () => {
  describe('get', () => {
    it('should return parameter value by key');
    it('should return undefined for non-existent key');
  });
  
  describe('getAsNumber', () => {
    it('should convert string to number');
    it('should handle invalid numbers');
  });
});
```

---

### Category 2: High Priority Improvements 🟡

#### 2.1 Enhance Error Handling and Logging

**Current Issues:**
- Uses `console.log` instead of proper logging framework
- Generic error catching without type checking
- Limited error context

**Recommendation:**
```typescript
import { Logger } from '@nestjs/common';

export class ParamStoreModule {
  private static readonly logger = new Logger(ParamStoreModule.name);

  private static async getSSMParameters(...) {
    try {
      // ... existing logic
    } catch (error) {
      const errorMessage = `Failed to fetch parameters from AWS SSM. Region: ${awsRegion}, Path: ${awsParamStorePath}`;
      
      if (continueOnError) {
        this.logger.warn(errorMessage, error.stack);
      } else {
        this.logger.error(errorMessage, error.stack);
        throw new Error(`${errorMessage}: ${error.message}`);
      }
    }
  }
}
```

#### 2.2 Add Input Validation

**Current Issues:**
- No validation for required fields
- No validation for region format
- Documentation mentions defaulting region to 'us-east-1' but not implemented

**Recommendation:**
```typescript
private static validateOptions(awsRegion: string, awsParamStorePath: string): void {
  if (!awsParamStorePath) {
    throw new Error('awsParamStorePath is required');
  }
  
  if (!awsParamStorePath.startsWith('/')) {
    throw new Error('awsParamStorePath must start with /');
  }
}

// Use in getSSMParameters:
private static async getSSMParameters(
  awsRegion: string = 'us-east-1',  // Default as documented
  awsParamStorePath: string,
  continueOnError: boolean,
): Promise<Parameter[]> {
  this.validateOptions(awsRegion, awsParamStorePath);
  // ... rest of logic
}
```

#### 2.3 Improve TypeScript Configuration

**Current Issues:**
- Missing strict mode checks
- No unused variable detection

**Recommendation:**
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2020",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "noLib": false,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

### Category 3: Feature Enhancements 🟢

#### 3.1 Extend Service Methods

**Recommendation:** Add utility methods to `ParamStoreService`:

```typescript
export class ParamStoreService {
  // ... existing methods
  
  /**
   * Get parameter value with fallback default
   */
  getOrDefault(key: string, defaultValue: string): string {
    return this._paramStoreParameters[key] ?? defaultValue;
  }
  
  /**
   * Parse parameter as boolean
   */
  getAsBoolean(key: string): boolean {
    const value = this._paramStoreParameters[key]?.toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }
  
  /**
   * Parse parameter as JSON object
   */
  getAsJSON<T>(key: string): T {
    const value = this._paramStoreParameters[key];
    return JSON.parse(value) as T;
  }
  
  /**
   * Check if parameter exists
   */
  has(key: string): boolean {
    return key in this._paramStoreParameters;
  }
  
  /**
   * Get all parameter keys
   */
  getAllKeys(): string[] {
    return Object.keys(this._paramStoreParameters);
  }
  
  /**
   * Get all parameters as object
   */
  getAll(): ParamStoreParameters {
    return { ...this._paramStoreParameters };
  }
}
```

#### 3.2 Add Parameter Refresh Capability

**Use Case:** Allow refreshing parameters without restarting the application

**Recommendation:**
```typescript
export class ParamStoreService {
  constructor(
    @Inject(AWS_PARAM_STORE_PROVIDER) awsParameters: Parameter[],
    @Inject('PARAM_STORE_CONFIG') private config: ModuleOptions,
  ) {
    this.loadParameters(awsParameters);
  }
  
  private loadParameters(awsParameters: Parameter[]): void {
    this._paramStoreParameters = {};
    awsParameters.forEach((parameter) => {
      const parameterPathTokens = parameter.Name.split('/');
      this._paramStoreParameters[
        parameterPathTokens[parameterPathTokens.length - 1]
      ] = parameter.Value;
    });
  }
  
  /**
   * Refresh parameters from AWS
   */
  async refresh(): Promise<void> {
    const parameters = await ParamStoreModule.getSSMParameters(
      this.config.awsRegion,
      this.config.awsParamStorePath,
      this.config.awsParamStoreContinueOnError,
    );
    this.loadParameters(parameters);
  }
}
```

#### 3.3 Support for Parameter Hierarchies

**Use Case:** Allow nested parameter structures instead of flat key-value

**Current Behavior:**
```
/app/database/host → stored as "host"
/app/database/port → stored as "port"
```

**Enhanced Behavior:**
```typescript
paramStoreService.get('database.host');
paramStoreService.get('database.port');
```

**Recommendation:**
```typescript
export interface ParamStoreModuleOptions extends ModuleOptions {
  preserveHierarchy?: boolean;
  pathSeparator?: string; // default: '.'
}

// In constructor:
if (options.preserveHierarchy) {
  // Convert /app/database/host → database.host
  const relativePath = parameter.Name.replace(awsParamStorePath, '')
    .split('/')
    .filter(Boolean)
    .join(options.pathSeparator || '.');
  this._paramStoreParameters[relativePath] = parameter.Value;
}
```

#### 3.4 Add Retry Logic with Exponential Backoff

**Use Case:** Handle transient AWS API failures

**Recommendation:**
```typescript
private static async getSSMParameters(
  awsRegion: string,
  awsParamStorePath: string,
  continueOnError: boolean,
  maxRetries: number = 3,
): Promise<Parameter[]> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await this.fetchParameters(awsRegion, awsParamStorePath);
    } catch (error) {
      lastError = error;
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      this.logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Handle final failure
  if (continueOnError) {
    this.logger.warn('All retry attempts failed', lastError);
    return [];
  } else {
    throw lastError;
  }
}
```

---

### Category 4: Documentation Improvements 📚

#### 4.1 Add JSDoc Comments

**Recommendation:** Add comprehensive documentation to all public APIs:

```typescript
/**
 * Service for accessing AWS Systems Manager Parameter Store parameters.
 * Parameters are fetched at application startup and cached in memory.
 * 
 * @example
 * ```typescript
 * constructor(private paramStore: ParamStoreService) {
 *   const dbHost = this.paramStore.get('database-host');
 *   const port = this.paramStore.getAsNumber('port');
 * }
 * ```
 */
@Injectable()
export class ParamStoreService {
  /**
   * Retrieve a parameter value as a string.
   * 
   * @param key - The parameter key (extracted from the parameter path)
   * @returns The parameter value, or undefined if not found
   * 
   * @example
   * ```typescript
   * // For parameter /app/config/api-key
   * const apiKey = paramStore.get('api-key');
   * ```
   */
  get(key: string): string {
    return this._paramStoreParameters[key];
  }
}
```

#### 4.2 Enhance README.md

**Add Sections:**
- **Troubleshooting Guide** - Common issues and solutions
- **Architecture Diagram** - Visual representation of module lifecycle
- **Security Best Practices** - IAM permissions needed, encryption recommendations
- **Performance Considerations** - Parameter count limits, cold start impact
- **Migration Guide** - Upgrading between major versions

**Example Addition:**
```markdown
## Troubleshooting

### Error: "Missing credentials in config"
**Cause:** AWS credentials not configured  
**Solution:** Ensure AWS credentials are available via:
- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- AWS credentials file (`~/.aws/credentials`)
- IAM role (when running on EC2/ECS/Lambda)

### Error: "AccessDeniedException"
**Cause:** Insufficient IAM permissions  
**Solution:** Add the following IAM policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ssm:GetParametersByPath",
      "ssm:GetParameter"
    ],
    "Resource": "arn:aws:ssm:REGION:ACCOUNT:parameter/your/path/*"
  }]
}
```
```

#### 4.3 Add CHANGELOG.md

**Recommendation:** Create `CHANGELOG.md` following Keep a Changelog format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Unit tests for core functionality
- Enhanced error handling with NestJS Logger
- Input validation for module options

### Fixed
- Typo: `awsParamSorePath` → `awsParamStorePath`

### Changed
- Improved TypeScript strict mode compliance

## [2.2.2] - 2024-XX-XX
### Fixed
- Updated dependencies

## [2.2.1] - Previous release
...
```

---

### Category 5: CI/CD and DevOps 🔧

#### 5.1 Enhance GitHub Actions Workflow

**Current State:** Only publishes on release  
**Recommendation:** Add comprehensive CI workflow

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
        if: matrix.node-version == '22.x'

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm pack
      - uses: actions/upload-artifact@v3
        with:
          name: package
          path: '*.tgz'
```

#### 5.2 Add Pre-commit Hooks

**Recommendation:** Use Husky for git hooks

```json
// package.json additions
{
  "scripts": {
    "prepare": "husky install && npm run build"
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

`.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npm test
```

#### 5.3 Add Dependabot Configuration

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
```

---

### Category 6: Security Enhancements 🔒

#### 6.1 Add Parameter Value Masking in Logs

**Issue:** Sensitive values might be logged  
**Recommendation:**

```typescript
private static maskSensitiveKeys = ['password', 'secret', 'key', 'token'];

private static shouldMaskValue(key: string): boolean {
  return this.maskSensitiveKeys.some(sensitive => 
    key.toLowerCase().includes(sensitive)
  );
}

// In logging:
this.logger.debug(`Loaded parameter: ${key} = ${
  this.shouldMaskValue(key) ? '***MASKED***' : value
}`);
```

#### 6.2 Add AWS Secrets Manager Support

**Use Case:** Some teams use Secrets Manager instead of Parameter Store

**Recommendation:**
```typescript
export interface ModuleOptions {
  awsRegion: string;
  awsParamStorePath: string;
  awsParamStoreContinueOnError?: boolean;
  useSecretsManager?: boolean; // New option
}

// Add separate method for Secrets Manager
private static async getSecretsManagerSecrets(...): Promise<Parameter[]> {
  // Implementation using @aws-sdk/client-secrets-manager
}
```

---

## Priority Matrix

### Must Have (Before Next Release)
| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Fix typo: `awsParamSorePath` → `awsParamStorePath` | Low | High |
| 🔴 P0 | Add unit tests | High | High |
| 🟡 P1 | Replace console.log with Logger | Low | Medium |
| 🟡 P1 | Add input validation | Medium | High |
| 🟡 P1 | Add CI workflow (lint, test, build) | Medium | High |

### Should Have (Next Minor Version)
| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🟢 P2 | Enhance service methods (getOrDefault, getAsBoolean, etc.) | Medium | Medium |
| 🟢 P2 | Add JSDoc documentation | Medium | Medium |
| 🟢 P2 | Improve TypeScript strict mode | Medium | Medium |
| 🟢 P2 | Add retry logic with backoff | Medium | Low |

### Nice to Have (Future Versions)
| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🟦 P3 | Parameter refresh capability | High | Low |
| 🟦 P3 | Support for parameter hierarchies | High | Low |
| 🟦 P3 | AWS Secrets Manager support | High | Low |
| 🟦 P3 | Comprehensive troubleshooting guide | Medium | Low |

---

## Implementation Roadmap

### Phase 1: Critical Fixes (1-2 weeks)
1. Fix typo in variable names across all files
2. Set up unit testing infrastructure
3. Write tests for ParamStoreService
4. Write tests for ParamStoreModule
5. Add input validation
6. Replace console.log with Logger

**Success Criteria:**
- All tests passing
- 80%+ code coverage
- No breaking changes (except typo fix which is a breaking change requiring major version bump)

### Phase 2: Quality Improvements (2-3 weeks)
1. Enhance TypeScript configuration
2. Add comprehensive JSDoc comments
3. Set up CI workflow
4. Add pre-commit hooks
5. Add retry logic with exponential backoff
6. Improve error messages

**Success Criteria:**
- CI pipeline running on all PRs
- All public APIs documented
- Improved error handling with context

### Phase 3: Feature Enhancements (3-4 weeks)
1. Extend service methods (getOrDefault, getAsBoolean, etc.)
2. Add parameter masking for sensitive values
3. Implement parameter refresh capability
4. Add support for parameter hierarchies
5. Create comprehensive troubleshooting guide

**Success Criteria:**
- All new features tested
- Documentation updated
- Backward compatibility maintained

### Phase 4: Advanced Features (Future)
1. AWS Secrets Manager support
2. Parameter change notifications
3. Performance monitoring and metrics
4. Integration examples for common frameworks

---

## Conclusion

The **param-store-service** project is a solid, functional NestJS module that solves a real problem well. The architecture is clean and follows NestJS best practices. However, there are several areas where improvements would significantly enhance the developer experience, reliability, and maintainability of the package.

**Key Takeaways:**
1. **Immediate action needed:** Fix the typo and add tests
2. **High value, low effort:** Improve error handling and logging
3. **Long-term value:** Enhanced service methods and refresh capability
4. **Professional polish:** Better CI/CD and comprehensive documentation

By implementing these recommendations in phases, the project can evolve from a functional utility into a production-grade, enterprise-ready solution.

---

## Appendix: Code Examples

### Example: Complete Test Suite Structure

```typescript
// src/param-store.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ParamStoreService } from './param-store.service';
import { AWS_PARAM_STORE_PROVIDER } from './constants';
import { Parameter } from '@aws-sdk/client-ssm';

describe('ParamStoreService', () => {
  let service: ParamStoreService;
  
  const mockParameters: Parameter[] = [
    { Name: '/app/config/database-host', Value: 'localhost' },
    { Name: '/app/config/database-port', Value: '5432' },
    { Name: '/app/config/api-key', Value: 'secret-key-123' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParamStoreService,
        {
          provide: AWS_PARAM_STORE_PROVIDER,
          useValue: mockParameters,
        },
      ],
    }).compile();

    service = module.get<ParamStoreService>(ParamStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parameter value by key', () => {
      expect(service.get('database-host')).toBe('localhost');
      expect(service.get('api-key')).toBe('secret-key-123');
    });

    it('should return undefined for non-existent key', () => {
      expect(service.get('non-existent')).toBeUndefined();
    });

    it('should extract parameter name from full path', () => {
      // Parameter /app/config/database-host should be accessible as 'database-host'
      expect(service.get('database-host')).toBeTruthy();
    });
  });

  describe('getAsNumber', () => {
    it('should convert string to number', () => {
      expect(service.getAsNumber('database-port')).toBe(5432);
    });

    it('should return NaN for non-numeric values', () => {
      expect(service.getAsNumber('database-host')).toBeNaN();
    });

    it('should return NaN for non-existent key', () => {
      expect(service.getAsNumber('non-existent')).toBeNaN();
    });
  });
});
```

### Example: Integration Test

```typescript
// test/param-store.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ParamStoreModule } from '../src/param-store.module';
import { ParamStoreService } from '../src/param-store.service';

describe('ParamStoreModule (e2e)', () => {
  let app: INestApplication;
  let paramStoreService: ParamStoreService;

  beforeAll(async () => {
    // Note: This requires AWS credentials and actual parameters in SSM
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ParamStoreModule.register({
          awsRegion: process.env.AWS_REGION || 'us-east-1',
          awsParamStorePath: process.env.TEST_PARAM_STORE_PATH || '/test/params',
          awsParamStoreContinueOnError: false,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    paramStoreService = app.get<ParamStoreService>(ParamStoreService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fetch parameters from AWS', () => {
    expect(paramStoreService).toBeDefined();
    // Add assertions based on your test parameters
  });

  it('should handle pagination correctly', () => {
    // Test with > 10 parameters
  });
});
```

---

**Document Version:** 1.0  
**Last Updated:** October 12, 2025  
**Next Review:** After implementing Phase 1 improvements