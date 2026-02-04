/**
 * ChatGPT export parser.
 *
 * ChatGPT exports are ZIP files containing:
 * - conversations.json: Machine-readable conversation data (tree structure)
 * - chat.html: Human-readable HTML version
 * - Other metadata files (user.json, etc.)
 *
 * The conversations.json uses a tree structure where messages are stored in a
 * "mapping" object with parent-child relationships. We traverse from current_node
 * backwards via parent links to reconstruct the conversation.
 *
 * 100% client-side - your data never leaves your browser.
 */

import type {
  ParsedExport,
  ParsedConversation,
  ParsedMessage,
  MessageRole,
} from '../types.js';

interface ChatGPTMessageNode {
  id: string;
  message?: {
    id?: string;
    author?: { role?: string };
    create_time?: number;
    content?: {
      content_type?: string;
      parts?: (string | null | { text?: string })[];
      text?: string;
    };
    metadata?: {
      is_user_system_message?: boolean;
      model_slug?: string;
      finish_details?: unknown;
    };
  };
  parent?: string;
  children?: string[];
}

interface ChatGPTConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<string, ChatGPTMessageNode>;
  current_node?: string;
  model?: string;
  plugin_ids?: string[];
  gizmo_id?: string;
  is_archived?: boolean;
}

/**
 * Detect if files represent a ChatGPT export.
 */
export function detectChatGPT(files: Map<string, string>): boolean {
  const conversationsJson = files.get('conversations.json');
  if (!conversationsJson) return false;

  try {
    const data = JSON.parse(conversationsJson);
    if (Array.isArray(data) && data.length > 0) {
      return 'mapping' in data[0] && 'current_node' in data[0];
    }
  } catch {
    // Invalid JSON
  }
  return false;
}

/**
 * Parse ChatGPT export files into unified format.
 */
export function parseChatGPT(files: Map<string, string>): ParsedExport {
  const conversationsJson = files.get('conversations.json');
  if (!conversationsJson) {
    throw new Error('conversations.json not found in ZIP');
  }

  let conversationsData: ChatGPTConversation[];
  try {
    conversationsData = JSON.parse(conversationsJson);
  } catch (e) {
    throw new Error(`Invalid JSON in conversations.json: ${e}`);
  }

  // Load user info if available
  const userInfo: Record<string, unknown> = {};
  const userJson = files.get('user.json');
  if (userJson) {
    try {
      Object.assign(userInfo, JSON.parse(userJson));
    } catch {
      // Ignore invalid user.json
    }
  }

  const conversations: ParsedConversation[] = [];
  const warnings: string[] = [];

  for (const convData of conversationsData) {
    try {
      const parsed = parseConversation(convData);
      if (parsed) {
        conversations.push(parsed);
      }
    } catch (e) {
      const title = convData.title || 'Unknown';
      warnings.push(`Failed to parse conversation '${truncate(title)}': ${e}`);
    }
  }

  return {
    source: 'chatgpt',
    conversations,
    userInfo,
    rawFileCount: files.size,
    parseWarnings: warnings,
  };
}

function parseConversation(data: ChatGPTConversation): ParsedConversation | null {
  const mapping = data.mapping;
  const currentNode = data.current_node;

  if (!mapping || !currentNode) {
    return null;
  }

  // Traverse the tree to get messages in order
  const messages = traverseMessageTree(mapping, currentNode);

  if (messages.length === 0) {
    return null;
  }

  // Parse timestamps
  let createdAt = parseTimestamp(data.create_time);
  const updatedAt = parseTimestamp(data.update_time);

  // Use first message time if no conversation time
  if (!createdAt && messages.length > 0) {
    const firstMsg = messages[0];
    if (firstMsg && firstMsg.timestamp) {
      createdAt = firstMsg.timestamp;
    }
  }

  if (!createdAt) {
    createdAt = new Date();
  }

  // Generate title if missing
  const title = data.title || generateTitle(messages);

  return {
    id: data.id || data.conversation_id || String(hashCode(JSON.stringify(data))),
    title,
    source: 'chatgpt',
    createdAt,
    updatedAt,
    messages,
    metadata: {
      model: data.model,
      pluginIds: data.plugin_ids || [],
      gizmoId: data.gizmo_id,
      isArchived: data.is_archived || false,
    },
  };
}

function traverseMessageTree(
  mapping: Record<string, ChatGPTMessageNode>,
  currentNode: string
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const visited = new Set<string>();
  let nodeId: string | undefined = currentNode;

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node: ChatGPTMessageNode | undefined = mapping[nodeId];

    if (!node) break;

    const message = parseMessageNode(node);
    if (message) {
      messages.push(message);
    }

    nodeId = node.parent;
  }

  // Reverse to get chronological order
  messages.reverse();
  return messages;
}

function parseMessageNode(node: ChatGPTMessageNode): ParsedMessage | null {
  const messageData = node.message;
  if (!messageData) return null;

  // Get author role
  const roleStr = messageData.author?.role?.toLowerCase() || '';
  const role = mapRole(roleStr);
  if (!role) return null;

  // Get content
  const content = extractContent(messageData);
  if (!content || !content.trim()) return null;

  // Skip system messages that are just metadata
  if (messageData.metadata?.is_user_system_message) {
    return null;
  }

  // Parse timestamp
  const timestamp = parseTimestamp(messageData.create_time);

  return {
    role,
    content,
    timestamp,
    metadata: {
      modelSlug: messageData.metadata?.model_slug,
      finishDetails: messageData.metadata?.finish_details,
      messageId: messageData.id,
    },
  };
}

function extractContent(messageData: ChatGPTMessageNode['message']): string {
  if (!messageData) return '';

  const contentObj = messageData.content;
  if (!contentObj) return '';

  const contentType = contentObj.content_type || '';

  if (contentType === 'text') {
    const parts = contentObj.parts || [];
    const textParts = parts
      .filter((p): p is string => typeof p === 'string')
      .filter(Boolean);
    return textParts.join('\n');
  }

  if (contentType === 'code') {
    const code = contentObj.text || '';
    return `\`\`\`\n${code}\n\`\`\``;
  }

  if (contentType === 'execution_output') {
    const output = contentObj.text || '';
    return `Output:\n\`\`\`\n${output}\n\`\`\``;
  }

  if (contentType === 'multimodal_text') {
    const parts = contentObj.parts || [];
    const textParts: string[] = [];
    for (const part of parts) {
      if (typeof part === 'string') {
        textParts.push(part);
      } else if (part && typeof part === 'object' && 'text' in part) {
        textParts.push(part.text || '');
      }
    }
    return textParts.join('\n');
  }

  // Fallback: try to extract any text
  if (contentObj.text) {
    return contentObj.text;
  }

  const parts = contentObj.parts || [];
  const textParts = parts
    .filter((p): p is string => typeof p === 'string')
    .filter(Boolean);
  return textParts.join('\n');
}

function mapRole(roleStr: string): MessageRole | null {
  const roleMap: Record<string, MessageRole> = {
    user: 'user',
    assistant: 'assistant',
    system: 'system',
    tool: 'assistant', // Tool outputs shown as assistant
  };
  return roleMap[roleStr] || null;
}

function parseTimestamp(timestamp: number | string | null | undefined): Date | undefined {
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
