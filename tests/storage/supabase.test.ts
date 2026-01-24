/**
 * Supabase storage adapter tests.
 *
 * These tests verify the adapter structure and auth logic.
 * Integration tests against a real Supabase instance would be
 * done in a separate e2e test suite.
 */

import { describe, it, expect } from 'vitest';
import { hashApiKey } from '../../src/storage/supabase/auth.js';

describe('Supabase Auth', () => {
  describe('hashApiKey', () => {
    it('should hash an API key consistently', () => {
      const key = 'ctx_test_key_12345';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = hashApiKey('ctx_test_key_1');
      const hash2 = hashApiKey('ctx_test_key_2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce a hex string', () => {
      const hash = hashApiKey('ctx_test_key');

      // Verify it's a valid hex string
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});

describe('SupabaseAdapter structure', () => {
  it('should export SupabaseAdapter class', async () => {
    const { SupabaseAdapter } = await import('../../src/storage/supabase/index.js');
    expect(SupabaseAdapter).toBeDefined();
    expect(typeof SupabaseAdapter).toBe('function');
  });

  it('should export SupabaseProjectStorage class', async () => {
    const { SupabaseProjectStorage } = await import('../../src/storage/supabase/index.js');
    expect(SupabaseProjectStorage).toBeDefined();
    expect(typeof SupabaseProjectStorage).toBe('function');
  });

  it('should export SupabaseArtifactStorage class', async () => {
    const { SupabaseArtifactStorage } = await import('../../src/storage/supabase/index.js');
    expect(SupabaseArtifactStorage).toBeDefined();
    expect(typeof SupabaseArtifactStorage).toBe('function');
  });

  it('should export auth utilities', async () => {
    const { validateApiKey, hashApiKey } = await import('../../src/storage/supabase/index.js');
    expect(validateApiKey).toBeDefined();
    expect(hashApiKey).toBeDefined();
    expect(typeof validateApiKey).toBe('function');
    expect(typeof hashApiKey).toBe('function');
  });
});

describe('SupabaseAdapterOptions', () => {
  it('should require supabaseUrl, supabaseServiceKey, and apiKey', async () => {
    const { SupabaseAdapter } = await import('../../src/storage/supabase/index.js');

    // Type check: these options are required
    const options = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-service-key',
      apiKey: 'ctx_test_api_key',
    };

    // Constructor should accept valid options
    const adapter = new SupabaseAdapter(options);
    expect(adapter).toBeDefined();
  });
});
