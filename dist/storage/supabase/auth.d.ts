/**
 * API key authentication for Supabase storage adapter.
 *
 * API keys are validated by hashing and looking up in the api_keys table.
 * The hash is compared using SHA-256.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
/**
 * Hash an API key using SHA-256.
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Validate an API key and return the user ID.
 *
 * @param client - Supabase client with service role
 * @param apiKey - The API key to validate
 * @returns The user ID if valid
 * @throws Error if the API key is invalid
 */
export declare function validateApiKey(client: SupabaseClient, apiKey: string): Promise<string>;
//# sourceMappingURL=auth.d.ts.map