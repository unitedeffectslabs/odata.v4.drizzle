import type { SQL } from 'drizzle-orm';
import type { PgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';

/**
 * A Drizzle table with columns - used for type inference
 */
export type DrizzleTable = PgTableWithColumns<any>;

/**
 * Column accessor function - maps field names to Drizzle columns
 */
export type ColumnAccessor<T extends DrizzleTable> = (fieldName: string) => PgColumn | undefined;

/**
 * Options for converting OData queries to Drizzle
 */
export interface ConvertOptions<T extends DrizzleTable> {
  /** The Drizzle table to query */
  table: T;
  /**
   * Optional column accessor function. If not provided, uses table[fieldName].
   * Use this for field name mapping (e.g., camelCase to snake_case).
   */
  getColumn?: ColumnAccessor<T>;
  /**
   * Field name mappings (OData field name → DB column name)
   * Example: { 'firstName': 'first_name' }
   */
  fieldMap?: Record<string, string>;
}

/**
 * Result of converting OData query options to Drizzle
 */
export interface DrizzleQueryOptions {
  /** WHERE clause condition */
  where?: SQL;
  /** ORDER BY expressions */
  orderBy?: SQL[];
  /** LIMIT value */
  limit?: number;
  /** OFFSET value */
  offset?: number;
  /** Columns to select (field names) */
  select?: string[];
}

/**
 * Result of converting just a filter expression
 */
export interface DrizzleFilterResult {
  /** The SQL condition */
  condition: SQL;
}
