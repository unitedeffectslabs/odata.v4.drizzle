# CLAUDE.md - OData Drizzle Converter

## Project Overview

Converts OData v4 AST (from @uev/odata-parser) to Drizzle ORM query parameters.

**Dependencies**:
- @uev/odata-parser (GitHub: unitedeffectslabs/odata.v4.parser)
- drizzle-orm (peer dependency)

## Package Management

**ALWAYS use `yarn`**, never npm.

## Architecture

```
src/
├── index.ts    # Main exports, re-exports parser
├── types.ts    # TypeScript interfaces
├── filter.ts   # $filter → Drizzle WHERE conversion
└── query.ts    # Full query options conversion
```

## OData → Drizzle Mapping

| OData | Drizzle |
|-------|---------|
| eq | eq() |
| ne | ne() |
| gt | gt() |
| ge | gte() |
| lt | lt() |
| le | lte() |
| and | and() |
| or | or() |
| not | not() |
| contains() | ilike('%val%') |
| startswith() | ilike('val%') |
| endswith() | ilike('%val') |
| null | isNull() |

## Commands

```bash
yarn build       # Build with tsup
yarn typecheck   # Type check
yarn test        # Run tests
yarn clean       # Remove dist
```

## Development Rules

- Zero runtime dependencies (except peer deps)
- Use modern TypeScript patterns
- Tests in `test/` directory

## Usage Pattern

```typescript
import { Parser, convertQueryOptions } from '@uelabs/odata-drizzle';
import { users } from './schema';

const parser = new Parser();
const ast = parser.query("$filter=age gt 21&$top=10");
const opts = convertQueryOptions(ast, { table: users });

// Use opts.where, opts.limit, etc. with Drizzle
```
