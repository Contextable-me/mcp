/**
 * API key authentication for Supabase storage adapter.
 *
 * API keys are validated by hashing and looking up in the api_keys table.
 * The hash is compared using SHA-256.
 */

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hash an API key using SHA-256.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate an API key and return the user ID.
 *
 * @param client - Supabase client with service role
 * @param apiKey - The API key to validate
 * @returns The user ID if valid
 * @throws Error if the API key is invalid
 */
export async function validateApiKey(
  client: SupabaseClient,
  apiKey: string
): Promise<string> {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key is required');
  }

  // Validate API key format (ctx_ prefix)
  if (!apiKey.startsWith('ctx_')) {
    throw new Error('Invalid API key format');
  }

  const keyHash = hashApiKey(apiKey);

  const { data, error } = await client
    .from('api_keys')
    .select('user_id, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    throw new Error('Invalid API key');
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error('API key has expired');
  }

  // Update last_used_at (fire and forget)
  client
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', keyHash)
    .then(() => {
      // Intentionally ignore result
    });

  return data.user_id;
}
