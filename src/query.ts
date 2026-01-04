import { asc, desc, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { TokenType, type Token } from '@uev/odata-parser';
import type { DrizzleTable, ConvertOptions, DrizzleQueryOptions } from './types';
import { convertFilter } from './filter';

/**
 * Get column from table using field name
 */
function getColumn<T extends DrizzleTable>(
  fieldName: string,
  options: ConvertOptions<T>
): PgColumn {
  const { table, getColumn: customGetColumn, fieldMap } = options;

  // Apply field mapping if provided
  const mappedName = fieldMap?.[fieldName] ?? fieldName;

  // Use custom accessor if provided
  if (customGetColumn) {
    const col = customGetColumn(mappedName);
    if (col) return col;
  }

  // Direct table access
  const col = (table as any)[mappedName];
  if (col) return col;

  throw new Error(`Unknown field: ${fieldName}`);
}

/**
 * Convert OData $orderby to Drizzle orderBy expressions
 */
function convertOrderBy<T extends DrizzleTable>(
  token: Token,
  options: ConvertOptions<T>
): SQL[] {
  const orderByItems: SQL[] = [];

  if (!token || !token.value) return orderByItems;

  // Handle OrderBy token
  if (token.type === TokenType.OrderBy) {
    const items = token.value.items || [token.value];

    for (const item of items) {
      if (item.type === TokenType.OrderByItem) {
        const fieldToken = item.value?.expr || item.value;
        const fieldName = fieldToken?.raw || fieldToken?.value?.raw || '';
        const direction = item.value?.direction;

        if (fieldName) {
          const column = getColumn(fieldName.trim(), options);
          if (direction === -1 || direction === 'desc') {
            orderByItems.push(desc(column));
          } else {
            orderByItems.push(asc(column));
          }
        }
      }
    }
  }

  return orderByItems;
}

/**
 * Convert OData $select to list of field names
 */
function convertSelect(token: Token): string[] {
  const fields: string[] = [];

  if (!token || !token.value) return fields;

  if (token.type === TokenType.Select) {
    const items = token.value.items || [];

    for (const item of items) {
      if (item.type === TokenType.SelectItem) {
        // Could be a star (*) or a field name
        if (item.raw === '*') {
          // Select all - return empty to indicate no filtering
          return [];
        }
        fields.push(item.raw);
      }
    }
  }

  return fields;
}

/**
 * Convert parsed OData query options to Drizzle query options
 */
export function convertQueryOptions<T extends DrizzleTable>(
  queryToken: Token,
  options: ConvertOptions<T>
): DrizzleQueryOptions {
  const result: DrizzleQueryOptions = {};

  if (!queryToken) return result;

  // Handle QueryOptions token (multiple options)
  if (queryToken.type === TokenType.QueryOptions) {
    const queryOptions = queryToken.value?.options || [];

    for (const opt of queryOptions) {
      switch (opt.type) {
        case TokenType.Filter:
          result.where = convertFilter(opt, options);
          break;

        case TokenType.OrderBy:
          result.orderBy = convertOrderBy(opt, options);
          break;

        case TokenType.Top:
          result.limit = parseInt(opt.value?.raw || opt.raw, 10);
          break;

        case TokenType.Skip:
          result.offset = parseInt(opt.value?.raw || opt.raw, 10);
          break;

        case TokenType.Select:
          result.select = convertSelect(opt);
          break;
      }
    }
  }
  // Handle single option tokens
  else if (queryToken.type === TokenType.Filter) {
    result.where = convertFilter(queryToken, options);
  }
  else if (queryToken.type === TokenType.OrderBy) {
    result.orderBy = convertOrderBy(queryToken, options);
  }
  else if (queryToken.type === TokenType.Top) {
    result.limit = parseInt(queryToken.value?.raw || queryToken.raw, 10);
  }
  else if (queryToken.type === TokenType.Skip) {
    result.offset = parseInt(queryToken.value?.raw || queryToken.raw, 10);
  }
  else if (queryToken.type === TokenType.Select) {
    result.select = convertSelect(queryToken);
  }

  return result;
}
