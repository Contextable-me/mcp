/**
 * Claude export parser.
 *
 * Claude exports are ZIP files containing JSON files with conversation data.
 * The structure is simpler than ChatGPT - messages are stored in a linear array.
 *
 * Export structure:
 * - conversations/ directory containing JSON files
 * - Or a single conversations.json file
 * - Messages use "human" and "assistant" roles
 *
 * 100% client-side - your data never leaves your browser.
 */

import type {
  ParsedExport,
  ParsedConversation,
  ParsedMessage,
  MessageRole,
} from '../types.js';

interface ClaudeMessage {
  uuid?: string;
  role?: string;
  sender?: string;
  text?: string;
  content?: string | Array<string | { type?: string; text?: string }>;
  message?: string;
  created_at?: string | number;
  createdAt?: string | number;
  timestamp?: string | number;
  attachments?: unknown[];
}

interface ClaudeConversation {
  uuid?: string;
  id?: string;
  name?: string;
  title?: string;
  chat_messages?: ClaudeMessage[];
  messages?: ClaudeMessage[];
  created_at?: string | number;
  createdAt?: string | number;
  created?: string | number;
  updated_at?: string | number;
  updatedAt?: string | number;
  updated?: string | number;
  model?: string;
  project_uuid?: string;
  is_starred?: boolean;
}

/**
 * Detect if files represent a Claude export.
 */
export function detectClaude(files: Map<string, string>): boolean {
  for (const [filename, content] of files) {
    if (!filename.endsWith('.json')) continue;

    try {
      const data = JSON.parse(content);
      if (isClaudeFormat(data)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function isClaudeFormat(data: unknown): boolean {
  // Could be a list of conversations
  if (Array.isArray(data) && data.length > 0) {
    const sample = data[0];
    if (typeof sample === 'object' && sample !== null) {
      // Claude uses "uuid" for IDs and "human"/"assistant" for roles
      if ('uuid' in sample || 'chat_messages' in sample) {
        return true;
      }
      // Check messages for Claude-specific roles
      const messages = (sample as ClaudeConversation).messages ||
        (sample as ClaudeConversation).chat_messages || [];
      for (const msg of messages.slice(0, 5)) {
        const role = msg.role || msg.sender || '';
        if (role.toLowerCase() === 'human') {
          return true;
        }
      }
    }
  }

  // Could be a single conversation
  if (typeof data === 'object' && data !== null) {
    if ('uuid' in data || 'chat_messages' in data) {
      return true;
    }
  }

  return false;
}

/**
 * Parse Claude export files into unified format.
 */
export function parseClaude(files: Map<string, string>): ParsedExport {
  const conversations: ParsedConversation[] = [];
  const warnings: string[] = [];

  for (const [filename, content] of files) {
    if (!filename.endsWith('.json')) continue;

    try {
      const data = JSON.parse(content);
      const result = parseJsonData(data);
      conversations.push(...result.conversations);
      warnings.push(...result.warnings);
    } catch (e) {
      warnings.push(`Failed to parse ${filename}: ${e}`);
    }
  }

  return {
    source: 'claude',
    conversations,
    userInfo: {},
    rawFileCount: files.size,
    parseWarnings: warnings,
  };
}

function parseJsonData(data: unknown): { conversations: ParsedConversation[]; warnings: string[] } {
  const conversations: ParsedConversation[] = [];
  const warnings: string[] = [];

  // Handle list of conversations
  if (Array.isArray(data)) {
    for (const item of data) {
      try {
        const parsed = parseConversation(item as ClaudeConversation);
        if (parsed) {
          conversations.push(parsed);
        }
      } catch (e) {
        const conv = item as ClaudeConversation;
        const title = conv.name || conv.title || 'Unknown';
        warnings.push(`Failed to parse conversation '${truncate(title)}': ${e}`);
      }
    }
  }
  // Handle single conversation
  else if (typeof data === 'object' && data !== null) {
    try {
      const parsed = parseConversation(data as ClaudeConversation);
      if (parsed) {
        conversations.push(parsed);
      }
    } catch (e) {
      warnings.push(`Failed to parse conversation: ${e}`);
    }
  }

  return { conversations, warnings };
}

function parseConversation(data: ClaudeConversation): ParsedConversation | null {
  // Get messages - Claude uses different field names
  const messagesData = data.chat_messages || data.messages || [];

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

  // Parse timestamps
  let createdAt = parseTimestamp(data.created_at || data.createdAt || data.created);
  const updatedAt = parseTimestamp(data.updated_at || data.updatedAt || data.updated);

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

  // Get title
  const title = data.name || data.title || generateTitle(messages);

  // Get ID
  const convId = data.uuid || data.id || String(hashCode(JSON.stringify(data)));

  return {
    id: convId,
    title,
    source: 'claude',
    createdAt,
    updatedAt,
    messages,
    metadata: {
      model: data.model,
      projectUuid: data.project_uuid,
      isStarred: data.is_starred || false,
    },
  };
}

function parseMessage(data: ClaudeMessage): ParsedMessage | null {
  // Get role - Claude uses "sender" or "role"
  const roleStr = (data.role || data.sender || '').toLowerCase();
  const role = mapRole(roleStr);
  if (!role) return null;

  // Get content
  const content = extractContent(data);
  if (!content || !content.trim()) return null;

  // Parse timestamp
  const timestamp = parseTimestamp(data.created_at || data.createdAt || data.timestamp);

  return {
    role,
    content,
    timestamp,
    metadata: {
      uuid: data.uuid,
      attachments: data.attachments || [],
    },
  };
}

function extractContent(data: ClaudeMessage): string {
  // Direct text field
  if (typeof data.text === 'string') {
    return data.text;
  }

  // Content field (could be string or list)
  const content = data.content;
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts: string[] = [];
    for (const block of content) {
      if (typeof block === 'string') {
        textParts.push(block);
      } else if (typeof block === 'object' && block !== null) {
        if (block.type === 'text' && block.text) {
          textParts.push(block.text);
        } else if ('text' in block && typeof block.text === 'string') {
          textParts.push(block.text);
        }
      }
    }
    return textParts.join('\n');
  }

  // Message field
  if (data.message) {
    return String(data.message);
  }

  return '';
}

function mapRole(roleStr: string): MessageRole | null {
  const roleMap: Record<string, MessageRole> = {
    human: 'user',
    user: 'user',
    assistant: 'assistant',
    ai: 'assistant',
    system: 'system',
  };
  return roleMap[roleStr] || null;
}

function parseTimestamp(timestamp: string | number | null | undefined): Date | undefined {
  if (timestamp == null) return undefined;

  try {
    if (typeof timestamp === 'number') {
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

function truncate(str: string, length = 30): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
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
