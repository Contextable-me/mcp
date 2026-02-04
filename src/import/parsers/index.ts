/**
 * Unified parser entry point with auto-detection.
 *
 * Automatically detects the export source (ChatGPT, Claude, Gemini)
 * and parses using the appropriate parser.
 *
 * Works in both browser (File) and Node.js (Buffer/path) environments.
 */

import JSZip from 'jszip';
import { readFile } from 'fs/promises';
import type { ParsedExport, ExportSource } from '../types.js';
import { detectChatGPT, parseChatGPT } from './chatgpt.js';
import { detectClaude, parseClaude } from './claude.js';
import { detectGemini, parseGemini } from './gemini.js';

export { parseChatGPT, parseClaude, parseGemini };

/**
 * Auto-detect which platform the export came from.
 */
export function detectSource(files: Map<string, string>): ExportSource | null {
  // Check in order of specificity
  if (detectChatGPT(files)) return 'chatgpt';
  if (detectGemini(files)) return 'gemini';
  if (detectClaude(files)) return 'claude';
  return null;
}

/**
 * Extract all files from a ZIP buffer as a Map of filename -> content.
 */
export async function extractZipFromBuffer(buffer: Buffer | ArrayBuffer): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const files = new Map<string, string>();

  const promises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      const promise = zipEntry.async('string').then(content => {
        files.set(relativePath, content);
      }).catch(() => {
        // Skip files that can't be read as text
      });
      promises.push(promise);
    }
  });

  await Promise.all(promises);
  return files;
}

/**
 * Parse an export from a file path.
 *
 * @param filePath - Path to the ZIP file
 * @returns ParsedExport with all conversations
 * @throws Error if the format is not recognized
 */
export async function parseExportFromPath(filePath: string): Promise<ParsedExport> {
  const buffer = await readFile(filePath);
  return parseExportFromBuffer(buffer);
}

/**
 * Parse an export from a buffer.
 *
 * @param buffer - ZIP file contents as Buffer or ArrayBuffer
 * @returns ParsedExport with all conversations
 * @throws Error if the format is not recognized
 */
export async function parseExportFromBuffer(buffer: Buffer | ArrayBuffer): Promise<ParsedExport> {
  // Extract ZIP contents
  const files = await extractZipFromBuffer(buffer);

  if (files.size === 0) {
    throw new Error('ZIP file appears to be empty or contains no readable files');
  }

  // Auto-detect source
  const source = detectSource(files);

  if (!source) {
    throw new Error(
      'Could not detect export format. Supported formats: ChatGPT, Claude, Gemini'
    );
  }

  // Parse with appropriate parser
  switch (source) {
    case 'chatgpt':
      return parseChatGPT(files);
    case 'claude':
      return parseClaude(files);
    case 'gemini':
      return parseGemini(files);
    default:
      throw new Error(`Unsupported export source: ${source}`);
  }
}
