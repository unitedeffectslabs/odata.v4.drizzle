/**
 * @odata/drizzle - Convert OData v4 AST to Drizzle ORM queries
 *
 * This package bridges the OData parser with Drizzle ORM, allowing you to
 * parse OData query strings and convert them to type-safe Drizzle queries.
 *
 * @example
 * ```typescript
 * import { Parser } from '@odata/parser';
 * import { convertQueryOptions } from '@odata/drizzle';
 * import { users } from './schema';
 *
 * const parser = new Parser();
 * const ast = parser.query("$filter=age gt 21&$orderby=name asc&$top=10");
 *
 * const drizzleOpts = convertQueryOptions(ast, { table: users });
 *
 * const results = await db
 *   .select()
 *   .from(users)
 *   .where(drizzleOpts.where)
 *   .orderBy(...drizzleOpts.orderBy)
 *   .limit(drizzleOpts.limit);
 * ```
 */

export { convertFilter } from './filter';
export { convertQueryOptions } from './query';
export type {
  DrizzleTable,
  ColumnAccessor,
  ConvertOptions,
  DrizzleQueryOptions,
  DrizzleFilterResult
} from './types';

// Re-export parser for convenience
export { Parser, TokenType, filter, query } from '@odata/parser';
