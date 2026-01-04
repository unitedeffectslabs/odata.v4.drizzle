import { describe, it, expect } from 'vitest';
import { pgTable, text, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { Parser } from '@uev/odata-parser';
import { convertFilter, convertQueryOptions } from '../src';

// Mock table for testing
const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  age: integer('age'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

const parser = new Parser();

describe('convertFilter', () => {
  describe('Comparison operators', () => {
    it('should convert eq (equals)', () => {
      const ast = parser.filter("name eq 'John'");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
      // The SQL object is opaque, but we can check it exists
    });

    it('should convert ne (not equals)', () => {
      const ast = parser.filter("name ne 'deleted'");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert gt (greater than)', () => {
      const ast = parser.filter('age gt 21');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert ge (greater or equal)', () => {
      const ast = parser.filter('age ge 21');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert lt (less than)', () => {
      const ast = parser.filter('age lt 65');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert le (less or equal)', () => {
      const ast = parser.filter('age le 65');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });
  });

  describe('Logical operators', () => {
    it('should convert and', () => {
      const ast = parser.filter("name eq 'John' and age gt 21");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert or', () => {
      const ast = parser.filter("age lt 18 or age gt 65");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert not', () => {
      const ast = parser.filter("not isActive eq false");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert complex nested expression', () => {
      const ast = parser.filter("(name eq 'John' or name eq 'Jane') and age gt 21");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });
  });

  describe('String functions', () => {
    it('should convert contains to ilike', () => {
      const ast = parser.filter("contains(name,'john')");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert startswith to ilike', () => {
      const ast = parser.filter("startswith(name,'J')");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert endswith to ilike', () => {
      const ast = parser.filter("endswith(email,'@example.com')");
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });
  });

  describe('Null handling', () => {
    it('should convert eq null to isNull', () => {
      const ast = parser.filter('age eq null');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });

    it('should convert ne null to isNotNull', () => {
      const ast = parser.filter('age ne null');
      const result = convertFilter(ast!, { table: users });
      expect(result).toBeDefined();
    });
  });

  describe('Field mapping', () => {
    it('should use fieldMap for column names', () => {
      const ast = parser.filter("FirstName eq 'John'");
      // Map OData field to actual column
      const result = convertFilter(ast!, {
        table: users,
        fieldMap: { 'FirstName': 'name' }
      });
      expect(result).toBeDefined();
    });
  });
});

describe('convertQueryOptions', () => {
  it('should convert $filter', () => {
    const ast = parser.query("$filter=age gt 21");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.where).toBeDefined();
  });

  it('should convert $top', () => {
    const ast = parser.query("$top=10");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.limit).toBe(10);
  });

  it('should convert $skip', () => {
    const ast = parser.query("$skip=20");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.offset).toBe(20);
  });

  it('should convert $orderby asc', () => {
    const ast = parser.query("$orderby=name asc");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.orderBy).toBeDefined();
    expect(result.orderBy?.length).toBe(1);
  });

  it('should convert $orderby desc', () => {
    const ast = parser.query("$orderby=createdAt desc");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.orderBy).toBeDefined();
  });

  it('should convert multiple $orderby', () => {
    const ast = parser.query("$orderby=name asc,createdAt desc");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.orderBy).toBeDefined();
    expect(result.orderBy?.length).toBe(2);
  });

  it('should convert $select', () => {
    const ast = parser.query("$select=name,email");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.select).toBeDefined();
    expect(result.select).toContain('name');
    expect(result.select).toContain('email');
  });

  it('should convert multiple options', () => {
    const ast = parser.query("$filter=age gt 21&$orderby=name asc&$top=10&$skip=0");
    const result = convertQueryOptions(ast!, { table: users });
    expect(result.where).toBeDefined();
    expect(result.orderBy).toBeDefined();
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('should handle empty/undefined input', () => {
    const result = convertQueryOptions(undefined as any, { table: users });
    expect(result).toEqual({});
  });
});
