# @odata/drizzle

Convert OData v4 query strings to Drizzle ORM queries.

## Features

- **Parse & Convert**: Uses @odata/parser to parse OData, converts AST to Drizzle
- **Type-Safe**: Full TypeScript support with Drizzle's type inference
- **Field Mapping**: Map OData field names to database column names
- **All Query Options**: Supports $filter, $orderby, $top, $skip, $select

## Installation

```bash
yarn add @odata/drizzle drizzle-orm
```

## Quick Start

```typescript
import { Parser, convertQueryOptions } from '@odata/drizzle';
import { db } from './db';
import { users } from './schema';

const parser = new Parser();

// Parse OData query string
const ast = parser.query("$filter=age gt 21&$orderby=name asc&$top=10");

// Convert to Drizzle options
const opts = convertQueryOptions(ast, { table: users });

// Use with Drizzle
const results = await db
  .select()
  .from(users)
  .where(opts.where)
  .orderBy(...(opts.orderBy || []))
  .limit(opts.limit || 100);
```

## API

### `convertQueryOptions(token, options)`

Converts parsed OData query options to Drizzle query parameters.

```typescript
interface ConvertOptions<T> {
  table: T;                          // Drizzle table
  getColumn?: (name: string) => PgColumn;  // Custom column accessor
  fieldMap?: Record<string, string>; // OData field → DB column mapping
}

interface DrizzleQueryOptions {
  where?: SQL;        // WHERE condition
  orderBy?: SQL[];    // ORDER BY expressions
  limit?: number;     // LIMIT value
  offset?: number;    // OFFSET value
  select?: string[];  // Field names to select
}
```

### `convertFilter(token, options)`

Converts just the $filter expression to a Drizzle WHERE condition.

```typescript
const ast = parser.filter("Name eq 'John' and Age gt 21");
const where = convertFilter(ast, { table: users });

await db.select().from(users).where(where);
```

## Supported OData Operators

### Comparison
| OData | Drizzle | Example |
|-------|---------|---------|
| `eq` | `eq()` | `Name eq 'John'` |
| `ne` | `ne()` | `Status ne 'deleted'` |
| `gt` | `gt()` | `Age gt 21` |
| `ge` | `gte()` | `Age ge 21` |
| `lt` | `lt()` | `Price lt 100` |
| `le` | `lte()` | `Price le 100` |

### Logical
| OData | Drizzle | Example |
|-------|---------|---------|
| `and` | `and()` | `Age gt 21 and Status eq 'active'` |
| `or` | `or()` | `Role eq 'admin' or Role eq 'super'` |
| `not` | `not()` | `not Status eq 'deleted'` |

### String Functions
| OData | Drizzle | Example |
|-------|---------|---------|
| `contains()` | `ilike('%val%')` | `contains(Name,'john')` |
| `startswith()` | `ilike('val%')` | `startswith(Name,'J')` |
| `endswith()` | `ilike('%val')` | `endswith(Email,'@example.com')` |

## Field Mapping

Map OData field names to database columns:

```typescript
const opts = convertQueryOptions(ast, {
  table: users,
  fieldMap: {
    'FirstName': 'first_name',
    'LastName': 'last_name',
    'CreatedAt': 'created_at'
  }
});
```

## License

MIT - United Effects Ventures LLC
