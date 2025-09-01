import crypto from 'crypto';

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

export function extractTags(content: string): string[] {
  const tagPattern = /#(\w+)/g;
  const matches = content.match(tagPattern) || [];
  return matches.map(tag => tag.substring(1));
}

export function extractWikiLinks(content: string): Array<{ link: string; file?: string; section?: string }> {
  const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
  const links: Array<{ link: string; file?: string; section?: string }> = [];
  
  let match;
  while ((match = wikiLinkPattern.exec(content)) !== null) {
    const link = match[1];
    const parts = link.split('#');
    
    links.push({
      link,
      file: parts[0] || undefined,
      section: parts[1] || undefined
    });
  }
  
  return links;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function parseCodeReference(reference: string): { file: string; line?: number; function?: string } | null {
  // Parse references like "file.ts:123" or "file.ts#functionName"
  const linePattern = /^(.+):(\d+)$/;
  const functionPattern = /^(.+)#(.+)$/;
  
  let match = reference.match(linePattern);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2])
    };
  }
  
  match = reference.match(functionPattern);
  if (match) {
    return {
      file: match[1],
      function: match[2]
    };
  }
  
  return null;
}

export function chunkText(text: string, chunkSize: number, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;
    
    if (start >= text.length - overlap) break;
  }
  
  return chunks;
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}