/**
 * Gemini export parser.
 *
 * Gemini exports come from Google Takeout as ZIP files containing:
 * - Takeout/Gemini Apps/Conversations/*.json files
 * - Or sometimes Gemini/conversations/*.json
 *
 * The format uses "user" and "model" roles with linear message arrays.
 *
 * 100% client-side - your data never leaves your browser.
 */

import type {
  ParsedExport,
  ParsedConversation,
  ParsedMessage,
  MessageRole,
} from '../types.js';

interface GeminiMessage {
  role?: string;
  content?: string | Array<string | { text?: string }>;
  text?: string;
  parts?: Array<string | { text?: string }>;
  timestamp?: string | number;
  createTime?: string | number;
  created_time?: string | number;
  citations?: unknown[];
}

interface GeminiConversation {
  id?: string;
  conversationId?: string;
  title?: string;
  name?: string;
  messages?: GeminiMessage[];
  createdTime?: string | number;
  created_time?: string | number;
  createTime?: string | number;
  lastModifiedTime?: string | number;
  last_modified_time?: string | number;
  updateTime?: string | number;
  isArchived?: boolean;
  language?: string;
}

// Possible paths where Gemini conversations might be stored
const CONVERSATION_PATHS = [
  'Takeout/Gemini Apps/Conversations/',
  'Gemini Apps/Conversations/',
  'Takeout/Gemini/conversations/',
  'Gemini/conversations/',
  'gemini/conversations/',
  'conversations/',
];

/**
 * Detect if files represent a Gemini/Google Takeout export.
 */
export function detectGemini(files: Map<string, string>): boolean {
  // Check for Takeout/Gemini structure
  for (const path of CONVERSATION_PATHS) {
    const matching = Array.from(files.keys()).filter(
      f => f.startsWith(path) && f.endsWith('.json')
    );
    if (matching.length > 0) {
      // Verify it's Gemini format
      for (const filename of matching.slice(0, 3)) {
        try {
          const data = JSON.parse(files.get(filename)!);
          if (isGeminiFormat(data)) {
            return true;
          }
        } catch {
          continue;
        }
      }
    }
  }

  // Also check root-level JSON files
  for (const [filename, content] of files) {
    if (filename.endsWith('.json') && !filename.includes('/')) {
      try {
        const data = JSON.parse(content);
        if (isGeminiFormat(data)) {
          return true;
        }
      } catch {
        continue;
      }
    }
  }

  return false;
}

function isGeminiFormat(data: unknown): boolean {
  // Single conversation object
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const conv = data as GeminiConversation;
    // Gemini has specific fields
    if ('createdTime' in conv || 'lastModifiedTime' in conv) {
      return true;
    }

    // Check for user/model roles in messages
    const messages = conv.messages || [];
    for (const msg of messages.slice(0, 5)) {
      const role = msg.role || '';
      if (role.toLowerCase() === 'model') {
        return true;
      }
    }
  }

  // List of conversations
  if (Array.isArray(data) && data.length > 0) {
    return isGeminiFormat(data[0]);
  }

  return false;
}

/**
 * Parse Gemini/Takeout export files into unified format.
 */
export function parseGemini(files: Map<string, string>): ParsedExport {
  const conversations: ParsedConversation[] = [];
  const warnings: string[] = [];

  // Find conversation files
  const conversationFiles = findConversationFiles(files);

  for (const [filename, content] of conversationFiles) {
    try {
      const data = JSON.parse(content);
      const result = parseJsonData(data, filename);
      conversations.push(...result.conversations);
      warnings.push(...result.warnings);
    } catch (e) {
      warnings.push(`Failed to parse ${filename}: ${e}`);
    }
  }

  return {
    source: 'gemini',
    conversations,
    userInfo: {},
    rawFileCount: files.size,
    parseWarnings: warnings,
  };
}

function findConversationFiles(files: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>();

  for (const path of CONVERSATION_PATHS) {
    for (const [filename, content] of files) {
      if (filename.startsWith(path) && filename.endsWith('.json')) {
        result.set(filename, content);
      }
    }
  }

  // If no structured paths found, try all root JSON files
  if (result.size === 0) {
    for (const [filename, content] of files) {
      if (filename.endsWith('.json')) {
        result.set(filename, content);
      }
    }
  }

  return result;
}

function parseJsonData(data: unknown, filename = ''): { conversations: ParsedConversation[]; warnings: string[] } {
  const conversations: ParsedConversation[] = [];
  const warnings: string[] = [];

  // Handle list of conversations
  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const parsed = parseConversation(item as GeminiConversation);
        if (parsed) {
          conversations.push(parsed);
        }
      } catch (e) {
        warnings.push(`Failed to parse conversation in ${filename}: ${e}`);
      }
    }
  }
  // Handle single conversation
  else if (typeof data === 'object' && data !== null) {
    try {
      const parsed = parseConversation(data as GeminiConversation);
      if (parsed) {
        conversations.push(parsed);
      }
    } catch (e) {
      warnings.push(`Failed to parse conversation in ${filename}: ${e}`);
    }
  }

  return { conversations, warnings };
}

function parseConversation(data: GeminiConversation): ParsedConversation | null {
  const messagesData = data.messages || [];

  if (messagesData.length === 0) {
    return null;
  }

  const messages: ParsedMessage[] = [];
  for (const msgData of messagesData) {
    const parsed = parseMessage(msgData);
    if (parsed) {
      messages.push(parsed);
    }
  }

  if (messages.length === 0) {
    return null;
  }

  // Parse timestamps (ISO 8601 format)
  let createdAt = parseTimestamp(data.createdTime || data.created_time || data.createTime);
  const updatedAt = parseTimestamp(data.lastModifiedTime || data.last_modified_time || data.updateTime);

  // Use first message timestamp if no conversation timestamp
  if (!createdAt && messages.length > 0) {
    const firstMsg = messages[0];
    if (firstMsg && firstMsg.timestamp) {
      createdAt = firstMsg.timestamp;
    }
  }

  if (!createdAt) {
    createdAt = new Date();
  }

  // Get title (Gemini doesn't always have titles)
  const title = data.title || data.name || generateTitle(messages);

  // Get ID
  const convId = data.id || data.conversationId || String(hashCode(JSON.stringify(data)));

  return {
    id: convId,
    title,
    source: 'gemini',
    createdAt,
    updatedAt,
    messages,
    metadata: {
      isArchived: data.isArchived || false,
      language: data.language,
    },
  };
}

function parseMessage(data: GeminiMessage): ParsedMessage | null {
  const roleStr = (data.role || '').toLowerCase();
  const role = mapRole(roleStr);
  if (!role) return null;

  const content = extractContent(data);
  if (!content || !content.trim()) return null;

  const timestamp = parseTimestamp(data.timestamp || data.createTime || data.created_time);

  return {
    role,
    content,
    timestamp,
    metadata: {
      citations: data.citations || [],
    },
  };
}

function extractContent(data: GeminiMessage): string {
  // Direct content field
  const content = data.content;
  if (typeof content === 'string') {
    return content;
  }

  // Text field
  if (typeof data.text === 'string') {
    return data.text;
  }

  // Parts array (similar to Gemini API format)
  const parts = data.parts || [];
  if (parts.length > 0) {
    const textParts: string[] = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        textParts.push(part);
      } else if (typeof part === 'object' && part !== null && 'text' in part) {
        textParts.push(part.text || '');
      }
    }
    return textParts.join('\n');
  }

  // Content as list
  if (Array.isArray(content)) {
    const textParts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        textParts.push(item);
      } else if (typeof item === 'object' && item !== null && 'text' in item) {
        textParts.push(item.text || '');
      }
    }
    return textParts.join('\n');
  }

  return '';
}

function mapRole(roleStr: string): MessageRole | null {
  const roleMap: Record<string, MessageRole> = {
    user: 'user',
    model: 'assistant',
    assistant: 'assistant',
    system: 'system',
  };
  return roleMap[roleStr] || null;
}

function parseTimestamp(timestamp: string | number | null | undefined): Date | undefined {
  if (timestamp == null) return undefined;

  try {
    if (typeof timestamp === 'number') {
      // Unix timestamp (milliseconds or seconds)
      if (timestamp > 1e12) {
        return new Date(timestamp); // Already milliseconds
      }
      return new Date(timestamp * 1000);
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp.replace('Z', '+00:00'));
    }
  } catch {
    // Invalid timestamp
  }
  return undefined;
}

function generateTitle(messages: ParsedMessage[]): string {
  for (const msg of messages) {
    if (msg.role === 'user') {
      const title = msg.content.slice(0, 50);
      return msg.content.length > 50 ? title + '...' : title;
    }
  }
  return 'Untitled Conversation';
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
