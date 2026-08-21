import {
  eq, ne, gt, gte, lt, lte,
  and, or, not,
  ilike,
  isNull, isNotNull,
  type SQL
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { TokenType, type Token } from '@uelabs/odata-parser';
import type { DrizzleTable, ConvertOptions } from './types';

/**
 * Extract the literal value from an OData token
 */
function extractValue(token: Token): unknown {
  if (!token) return null;

  // Check for Literal type
  if (token.type === TokenType.Literal) {
    const edmType = token.value;
    const raw = token.raw;

    // String literal - remove quotes
    if (edmType === 'Edm.String') {
      return raw.slice(1, -1).replace(/''/g, "'");
    }
    // Boolean
    if (edmType === 'Edm.Boolean') {
      return raw === 'true';
    }
    // Null
    if (raw === 'null') {
      return null;
    }
    // Numbers
    if (edmType === 'Edm.Int32' || edmType === 'Edm.Int64' || edmType === 'Edm.Int16' || edmType === 'Edm.Byte' || edmType === 'Edm.SByte') {
      return parseInt(raw, 10);
    }
    if (edmType === 'Edm.Double' || edmType === 'Edm.Single' || edmType === 'Edm.Decimal') {
      return parseFloat(raw);
    }
    // GUID
    if (edmType === 'Edm.Guid') {
      return raw;
    }
    // Date/Time
    if (edmType === 'Edm.DateTimeOffset' || edmType === 'Edm.Date') {
      return new Date(raw);
    }

    return raw;
  }

  return token.raw;
}

/**
 * Extract field name from a member expression
 */
function extractFieldName(token: Token): string {
  if (!token) return '';

  // FirstMemberExpression or MemberExpression
  if (token.type === TokenType.FirstMemberExpression || token.type === TokenType.MemberExpression) {
    if (token.value?.property) {
      return token.value.property.raw || token.value.property;
    }
    if (token.value?.name) {
      return token.value.name;
    }
    return token.raw;
  }

  // ODataIdentifier
  if (token.type === TokenType.ODataIdentifier) {
    return token.raw;
  }

  // CommonExpression wrapping something
  if (token.type === TokenType.CommonExpression) {
    return extractFieldName(token.value);
  }

  return token.raw;
}

/**
 * Get column from table using field name
 */
function getColumn<T extends DrizzleTable>(
  fieldName: string,
  options: ConvertOptions<T>
): PgColumn {
  const { table, getColumn, fieldMap } = options;

  // Apply field mapping if provided
  const mappedName = fieldMap?.[fieldName] ?? fieldName;

  // Use custom accessor if provided
  if (getColumn) {
    const col = getColumn(mappedName);
    if (col) return col;
  }

  // Direct table access
  const col = (table as any)[mappedName];
  if (col) return col;

  throw new Error(`Unknown field: ${fieldName}`);
}

/**
 * Convert an OData filter expression to a Drizzle SQL condition
 */
export function convertFilter<T extends DrizzleTable>(
  token: Token,
  options: ConvertOptions<T>
): SQL | undefined {
  if (!token) return undefined;

  const type = token.type;

  // Comparison expressions
  if (type === TokenType.EqualsExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    const column = getColumn(field, options);

    if (value === null) {
      return isNull(column);
    }
    return eq(column, value);
  }

  if (type === TokenType.NotEqualsExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    const column = getColumn(field, options);

    if (value === null) {
      return isNotNull(column);
    }
    return ne(column, value);
  }

  if (type === TokenType.GreaterThanExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    return gt(getColumn(field, options), value);
  }

  if (type === TokenType.GreaterOrEqualsExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    return gte(getColumn(field, options), value);
  }

  if (type === TokenType.LesserThanExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    return lt(getColumn(field, options), value);
  }

  if (type === TokenType.LesserOrEqualsExpression) {
    const field = extractFieldName(token.value.left);
    const value = extractValue(token.value.right);
    return lte(getColumn(field, options), value);
  }

  // Logical expressions
  if (type === TokenType.AndExpression) {
    const left = convertFilter(token.value.left, options);
    const right = convertFilter(token.value.right, options);
    if (left && right) return and(left, right);
    return left || right;
  }

  if (type === TokenType.OrExpression) {
    const left = convertFilter(token.value.left, options);
    const right = convertFilter(token.value.right, options);
    if (left && right) return or(left, right);
    return left || right;
  }

  if (type === TokenType.NotExpression) {
    const inner = convertFilter(token.value, options);
    if (inner) return not(inner);
    return undefined;
  }

  // Parentheses
  if (type === TokenType.ParenExpression) {
    return convertFilter(token.value, options);
  }

  // Method calls (contains, startswith, endswith)
  if (type === TokenType.MethodCallExpression) {
    const methodName = token.value?.method?.toLowerCase();
    const params = token.value?.parameters || [];

    if (methodName === 'contains' && params.length >= 2) {
      const field = extractFieldName(params[0]);
      const value = extractValue(params[1]);
      const column = getColumn(field, options);
      return ilike(column, `%${value}%`);
    }

    if (methodName === 'startswith' && params.length >= 2) {
      const field = extractFieldName(params[0]);
      const value = extractValue(params[1]);
      const column = getColumn(field, options);
      return ilike(column, `${value}%`);
    }

    if (methodName === 'endswith' && params.length >= 2) {
      const field = extractFieldName(params[0]);
      const value = extractValue(params[1]);
      const column = getColumn(field, options);
      return ilike(column, `%${value}`);
    }

    // For boolean-returning methods like contains(), the result itself is the condition
    // This handles cases like $filter=contains(Name,'john') where it's the entire expression
  }

  // CommonExpression - may wrap other expressions
  if (type === TokenType.CommonExpression) {
    return convertFilter(token.value, options);
  }

  // Filter token from $filter=...
  if (type === TokenType.Filter) {
    return convertFilter(token.value, options);
  }

  return undefined;
}
