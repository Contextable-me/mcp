/**
 * Types for client-side chat export parsing and analysis.
 *
 * Ported from shared/importers/models.py
 * All processing happens in the browser - your data never leaves your device.
 */

// Supported export sources
export type ExportSource = 'chatgpt' | 'claude' | 'gemini';

// Normalized message roles
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * A single message in a conversation, normalized across platforms.
 *
 * Role mapping:
 * - ChatGPT: user/assistant/system → user/assistant/system
 * - Claude: human/assistant → user/assistant
 * - Gemini: user/model → user/assistant
 */
export interface ParsedMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * A single conversation/chat thread, normalized across platforms.
 */
export interface ParsedConversation {
  id: string;
  title: string;
  source: ExportSource;
  createdAt: Date;
  updatedAt?: Date;
  messages: ParsedMessage[];
  metadata?: Record<string, unknown>;
}

/**
 * Complete parsed export from a platform.
 */
export interface ParsedExport {
  source: ExportSource;
  conversations: ParsedConversation[];
  userInfo?: Record<string, unknown>;
  rawFileCount: number;
  parseWarnings: string[];
}

/**
 * A cluster of conversations sharing a common topic.
 */
export interface TopicCluster {
  name: string;
  keywords: string[];
  conversationIds: string[];
  conversationCount: number;
  percentage: number;
  sampleTitles: string[];
  totalMessages: number;
}

/**
 * A decision extracted from conversations.
 */
export interface DetectedDecision {
  decision: string;
  context: string;
  conversationId: string;
  confidence: number;
}

/**
 * A usage pattern detected across conversations.
 */
export interface UsagePattern {
  patternType: string;
  description: string;
  examples: string[];
}

/**
 * A potential project detected from conversation clusters.
 */
export interface DetectedProject {
  suggestedName: string;
  conversationIds: string[];
  keyTopics: string[];
  suggestedArtifacts: Array<{
    name: string;
    content: string;
    type: string;
  }>;
}

/**
 * Complete analysis results from a parsed export.
 */
export interface ConversationAnalysis {
  source: ExportSource;
  totalConversations: number;
  totalMessages: number;
  totalWords: number;
  dateRange: [Date | null, Date | null];
  topics: TopicCluster[];
  decisions: DetectedDecision[];
  patterns: UsagePattern[];
  detectedProjects: DetectedProject[];
  topKeywords: string[];
  avgMessagesPerConversation: number;
  avgWordsPerMessage: number;
}

// Helper functions for computed properties

export function getMessageCount(conv: ParsedConversation): number {
  return conv.messages.length;
}

export function getUserMessageCount(conv: ParsedConversation): number {
  return conv.messages.filter(m => m.role === 'user').length;
}

export function getAssistantMessageCount(conv: ParsedConversation): number {
  return conv.messages.filter(m => m.role === 'assistant').length;
}

export function getTotalWords(conv: ParsedConversation): number {
  return conv.messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
}

export function getExportDateRange(exp: ParsedExport): [Date | null, Date | null] {
  if (exp.conversations.length === 0) {
    return [null, null];
  }
  const dates = exp.conversations.map(c => c.createdAt);
  return [
    new Date(Math.min(...dates.map(d => d.getTime()))),
    new Date(Math.max(...dates.map(d => d.getTime())))
  ];
}

export function getExportTotalMessages(exp: ParsedExport): number {
  return exp.conversations.reduce((sum, c) => sum + c.messages.length, 0);
}

export function getExportTotalWords(exp: ParsedExport): number {
  return exp.conversations.reduce((sum, c) => sum + getTotalWords(c), 0);
}
