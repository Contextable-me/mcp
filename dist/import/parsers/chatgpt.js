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
/**
 * Detect if files represent a ChatGPT export.
 */
export function detectChatGPT(files) {
    const conversationsJson = files.get('conversations.json');
    if (!conversationsJson)
        return false;
    try {
        const data = JSON.parse(conversationsJson);
        if (Array.isArray(data) && data.length > 0) {
            return 'mapping' in data[0] && 'current_node' in data[0];
        }
    }
    catch {
        // Invalid JSON
    }
    return false;
}
/**
 * Parse ChatGPT export files into unified format.
 */
export function parseChatGPT(files) {
    const conversationsJson = files.get('conversations.json');
    if (!conversationsJson) {
        throw new Error('conversations.json not found in ZIP');
    }
    let conversationsData;
    try {
        conversationsData = JSON.parse(conversationsJson);
    }
    catch (e) {
        throw new Error(`Invalid JSON in conversations.json: ${e}`);
    }
    // Load user info if available
    const userInfo = {};
    const userJson = files.get('user.json');
    if (userJson) {
        try {
            Object.assign(userInfo, JSON.parse(userJson));
        }
        catch {
            // Ignore invalid user.json
        }
    }
    const conversations = [];
    const warnings = [];
    for (const convData of conversationsData) {
        try {
            const parsed = parseConversation(convData);
            if (parsed) {
                conversations.push(parsed);
            }
        }
        catch (e) {
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
function parseConversation(data) {
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
function traverseMessageTree(mapping, currentNode) {
    const messages = [];
    const visited = new Set();
    let nodeId = currentNode;
    while (nodeId && !visited.has(nodeId)) {
        visited.add(nodeId);
        const node = mapping[nodeId];
        if (!node)
            break;
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
function parseMessageNode(node) {
    const messageData = node.message;
    if (!messageData)
        return null;
    // Get author role
    const roleStr = messageData.author?.role?.toLowerCase() || '';
    const role = mapRole(roleStr);
    if (!role)
        return null;
    // Get content
    const content = extractContent(messageData);
    if (!content || !content.trim())
        return null;
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
function extractContent(messageData) {
    if (!messageData)
        return '';
    const contentObj = messageData.content;
    if (!contentObj)
        return '';
    const contentType = contentObj.content_type || '';
    if (contentType === 'text') {
        const parts = contentObj.parts || [];
        const textParts = parts
            .filter((p) => typeof p === 'string')
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
        const textParts = [];
        for (const part of parts) {
            if (typeof part === 'string') {
                textParts.push(part);
            }
            else if (part && typeof part === 'object' && 'text' in part) {
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
        .filter((p) => typeof p === 'string')
        .filter(Boolean);
    return textParts.join('\n');
}
function mapRole(roleStr) {
    const roleMap = {
        user: 'user',
        assistant: 'assistant',
        system: 'system',
        tool: 'assistant', // Tool outputs shown as assistant
    };
    return roleMap[roleStr] || null;
}
function parseTimestamp(timestamp) {
    if (timestamp == null)
        return undefined;
    try {
        if (typeof timestamp === 'number') {
            return new Date(timestamp * 1000);
        }
        if (typeof timestamp === 'string') {
            return new Date(timestamp.replace('Z', '+00:00'));
        }
    }
    catch {
        // Invalid timestamp
    }
    return undefined;
}
function generateTitle(messages) {
    for (const msg of messages) {
        if (msg.role === 'user') {
            const title = msg.content.slice(0, 50);
            return msg.content.length > 50 ? title + '...' : title;
        }
    }
    return 'Untitled Conversation';
}
function truncate(str, length = 30) {
    return str.length > length ? str.slice(0, length) + '...' : str;
}
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
//# sourceMappingURL=chatgpt.js.map