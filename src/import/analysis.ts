/**
 * Client-side conversation analysis engine.
 *
 * Extracts topics, detects patterns, and identifies potential projects
 * from parsed chat exports. All processing happens in the browser.
 *
 * 100% client-side - your data never leaves your browser.
 */

import type {
  ParsedExport,
  ParsedConversation,
  ConversationAnalysis,
  TopicCluster,
  DetectedProject,
  DetectedDecision,
  UsagePattern,
} from './types.js';

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why',
  'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
  'if', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'while', 'because',
  'any', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him',
  'us', 'them', 'up', 'down', 'out', 'off', 'over', 'am', 'being',
  'like', 'want', 'know', 'think', 'make', 'get', 'go', 'see', 'come',
  'take', 'use', 'find', 'give', 'tell', 'work', 'call', 'try', 'ask',
  'put', 'mean', 'let', 'keep', 'begin', 'seem', 'help', 'show', 'hear',
  'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen',
  'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
  'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
  'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend',
  'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider',
  'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build',
  'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'ok', 'okay', 'yes',
  'no', 'please', 'thanks', 'thank', 'sorry', 'hello', 'hi', 'hey',
  'sure', 'right', 'yeah', 'well', 'really', 'actually', 'basically',
  'probably', 'maybe', 'something', 'anything', 'everything', 'nothing',
  'someone', 'anyone', 'everyone', 'one', 'two', 'three', 'first',
  'new', 'good', 'great', 'best', 'better', 'much', 'many', 'way',
  'even', 'back', 'still', 'thing', 'things', 'time', 'times', 'lot',
]);

// Technical terms that indicate specific domains
const TECHNICAL_DOMAINS: Record<string, string[]> = {
  'Python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'pip', 'pytest'],
  'JavaScript': ['javascript', 'js', 'typescript', 'ts', 'react', 'vue', 'angular', 'node', 'npm', 'webpack'],
  'Web Development': ['html', 'css', 'frontend', 'backend', 'fullstack', 'api', 'rest', 'graphql', 'http'],
  'Database': ['database', 'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'orm', 'query'],
  'DevOps': ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'ci', 'cd', 'pipeline', 'deploy'],
  'Machine Learning': ['ml', 'ai', 'model', 'training', 'neural', 'tensorflow', 'pytorch', 'sklearn'],
  'Mobile': ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'mobile app'],
  'Security': ['security', 'auth', 'authentication', 'authorization', 'oauth', 'jwt', 'encryption'],
  'Testing': ['test', 'testing', 'unittest', 'pytest', 'jest', 'mocha', 'coverage', 'tdd'],
  'Architecture': ['architecture', 'design pattern', 'microservice', 'monolith', 'scalability'],
};

// Decision indicator patterns
const DECISION_PATTERNS = [
  /\b(?:i|we)\s+(?:decided|chose|selected|picked|went with|opted for)\s+/i,
  /\b(?:let's|let us)\s+(?:go with|use|try|pick)\s+/i,
  /\bthe decision (?:is|was) to\b/i,
  /\bwe(?:'ll| will) (?:use|go with|implement)\b/i,
  /\bfinal (?:choice|decision|answer):\s*/i,
];

/**
 * Analyze a parsed export to extract insights.
 * All processing happens in your browser.
 */
export function analyzeExport(exp: ParsedExport): ConversationAnalysis {
  const totalConversations = exp.conversations.length;
  const totalMessages = exp.conversations.reduce((sum, c) => sum + c.messages.length, 0);
  const totalWords = exp.conversations.reduce(
    (sum, c) => sum + c.messages.reduce((s, m) => s + m.content.split(/\s+/).length, 0),
    0
  );

  // Calculate date range
  const dates = exp.conversations.map(c => c.createdAt);
  const dateRange: [Date | null, Date | null] = dates.length > 0
    ? [new Date(Math.min(...dates.map(d => d.getTime()))), new Date(Math.max(...dates.map(d => d.getTime())))]
    : [null, null];

  // Extract keywords for each conversation
  const convKeywords = new Map<string, Set<string>>();
  for (const conv of exp.conversations) {
    const keywords = extractConversationKeywords(conv);
    if (keywords.size > 0) {
      convKeywords.set(conv.id, keywords);
    }
  }

  // Build global keyword frequencies
  const allKeywords = new Map<string, number>();
  for (const keywords of convKeywords.values()) {
    for (const kw of keywords) {
      allKeywords.set(kw, (allKeywords.get(kw) || 0) + 1);
    }
  }

  // Get top keywords
  const topKeywords = Array.from(allKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([kw]) => kw);

  // Extract topics
  const topics = extractTopics(exp, convKeywords, topKeywords);

  // Extract decisions
  const decisions = extractDecisions(exp);

  // Detect patterns
  const patterns = detectPatterns(exp);

  // Detect potential projects
  const detectedProjects = detectProjects(exp, topics);

  return {
    source: exp.source,
    totalConversations,
    totalMessages,
    totalWords,
    dateRange,
    topics,
    decisions,
    patterns,
    detectedProjects,
    topKeywords,
    avgMessagesPerConversation: totalConversations > 0
      ? Math.round((totalMessages / totalConversations) * 10) / 10
      : 0,
    avgWordsPerMessage: totalMessages > 0
      ? Math.round((totalWords / totalMessages) * 10) / 10
      : 0,
  };
}

function extractConversationKeywords(conv: ParsedConversation): Set<string> {
  const textParts = [conv.title.toLowerCase()];

  // Get user messages (what the user was asking about)
  for (const msg of conv.messages) {
    if (msg.role === 'user') {
      textParts.push(msg.content.toLowerCase());
    }
  }

  const fullText = textParts.join(' ');

  // Extract words
  const words = fullText.match(/\b[a-z][a-z0-9_]*[a-z0-9]\b/g) || [];

  // Filter stop words and short words
  const keywords = new Set<string>();
  for (const word of words) {
    if (!STOP_WORDS.has(word) && word.length > 2) {
      keywords.add(word);
    }
  }

  // Also extract technical terms
  for (const terms of Object.values(TECHNICAL_DOMAINS)) {
    for (const term of terms) {
      if (fullText.includes(term.toLowerCase())) {
        keywords.add(term);
      }
    }
  }

  return keywords;
}

function extractTopics(
  exp: ParsedExport,
  convKeywords: Map<string, Set<string>>,
  topKeywords: string[]
): TopicCluster[] {
  if (exp.conversations.length === 0) return [];

  const convMap = new Map(exp.conversations.map(c => [c.id, c]));
  const clusters: TopicCluster[] = [];
  const usedConvs = new Set<string>();

  // Detect technical domain topics first
  for (const [domain, terms] of Object.entries(TECHNICAL_DOMAINS)) {
    const termSet = new Set(terms);
    const matchingConvs: string[] = [];

    for (const [convId, keywords] of convKeywords) {
      const hasMatch = Array.from(keywords).some(kw => termSet.has(kw));
      if (hasMatch) {
        matchingConvs.push(convId);
      }
    }

    if (matchingConvs.length >= 2) {
      const convs = matchingConvs.map(id => convMap.get(id)!).filter(Boolean);
      clusters.push({
        name: domain,
        keywords: terms.filter(t =>
          matchingConvs.some(cid => convKeywords.get(cid)?.has(t))
        ).slice(0, 10),
        conversationIds: matchingConvs,
        conversationCount: matchingConvs.length,
        percentage: Math.round((matchingConvs.length / exp.conversations.length) * 1000) / 10,
        sampleTitles: convs.slice(0, 5).map(c => c.title),
        totalMessages: convs.reduce((sum, c) => sum + c.messages.length, 0),
      });
      matchingConvs.forEach(id => usedConvs.add(id));
    }
  }

  // Cluster remaining by shared keywords
  for (const keyword of topKeywords) {
    if (clusters.length >= 10) break;

    const matching = Array.from(convKeywords.entries())
      .filter(([cid, kws]) => kws.has(keyword) && !usedConvs.has(cid))
      .map(([cid]) => cid);

    if (matching.length >= 2) {
      const convs = matching.map(id => convMap.get(id)!).filter(Boolean);

      // Find common keywords
      const commonKeywords = new Set<string>();
      commonKeywords.add(keyword);

      clusters.push({
        name: keyword.charAt(0).toUpperCase() + keyword.slice(1).replace(/_/g, ' '),
        keywords: [keyword, ...Array.from(commonKeywords).slice(0, 9)],
        conversationIds: matching,
        conversationCount: matching.length,
        percentage: Math.round((matching.length / exp.conversations.length) * 1000) / 10,
        sampleTitles: convs.slice(0, 5).map(c => c.title),
        totalMessages: convs.reduce((sum, c) => sum + c.messages.length, 0),
      });
      matching.forEach(id => usedConvs.add(id));
    }
  }

  // Sort by size
  clusters.sort((a, b) => b.conversationCount - a.conversationCount);

  return clusters.slice(0, 10);
}

function extractDecisions(exp: ParsedExport): DetectedDecision[] {
  const decisions: DetectedDecision[] = [];

  for (const conv of exp.conversations) {
    for (const msg of conv.messages) {
      if (msg.role !== 'user') continue;

      for (const pattern of DECISION_PATTERNS) {
        const match = msg.content.match(pattern);
        if (match) {
          // Extract the decision context (sentence containing the match)
          const sentences = msg.content.split(/[.!?]+/);
          const sentence = sentences.find(s => pattern.test(s)) || msg.content.slice(0, 200);

          decisions.push({
            decision: sentence.trim().slice(0, 200),
            context: conv.title,
            conversationId: conv.id,
            confidence: 0.7,
          });
          break; // One decision per message
        }
      }
    }
  }

  return decisions.slice(0, 20);
}

function detectPatterns(exp: ParsedExport): UsagePattern[] {
  const patterns: UsagePattern[] = [];

  // Time of day pattern
  const hourCounts = new Map<number, number>();
  for (const conv of exp.conversations) {
    const hour = conv.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  const peakHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (peakHours.length > 0) {
    const hourLabels = peakHours.map(([h, c]) => {
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}${period} (${c} conversations)`;
    });

    patterns.push({
      patternType: 'time_of_day',
      description: `You tend to use AI most during ${hourLabels[0]}`,
      examples: hourLabels,
    });
  }

  // Conversation length pattern
  const lengths = exp.conversations.map(c => c.messages.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const longConvs = exp.conversations.filter(c => c.messages.length > avgLength * 2);

  if (longConvs.length > 0) {
    patterns.push({
      patternType: 'conversation_depth',
      description: `${longConvs.length} conversations went deep (${Math.round(avgLength * 2)}+ messages)`,
      examples: longConvs.slice(0, 3).map(c => c.title),
    });
  }

  return patterns;
}

function detectProjects(exp: ParsedExport, topics: TopicCluster[]): DetectedProject[] {
  const projects: DetectedProject[] = [];

  // Create a project for each significant topic cluster
  for (const topic of topics.slice(0, 5)) {
    if (topic.conversationCount < 2) continue;

    // Find representative conversations
    const convs = exp.conversations.filter(c => topic.conversationIds.includes(c.id));

    // Generate suggested artifacts from conversation content
    const suggestedArtifacts: DetectedProject['suggestedArtifacts'] = [];

    // Create a summary artifact
    const summaryContent = convs.slice(0, 3).map(c => {
      const userMsgs = c.messages.filter(m => m.role === 'user');
      const preview = userMsgs[0]?.content.slice(0, 200) || '';
      return `## ${c.title}\n${preview}${preview.length >= 200 ? '...' : ''}`;
    }).join('\n\n');

    suggestedArtifacts.push({
      name: `${topic.name} Overview`,
      content: `# ${topic.name}\n\nKey conversations and topics from your AI chat history.\n\n${summaryContent}`,
      type: 'document',
    });

    projects.push({
      suggestedName: topic.name,
      conversationIds: topic.conversationIds,
      keyTopics: topic.keywords,
      suggestedArtifacts,
    });
  }

  return projects;
}
