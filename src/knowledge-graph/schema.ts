export enum NodeType {
  FILE = 'File',
  FUNCTION = 'Function',
  CLASS = 'Class',
  METHOD = 'Method',
  VARIABLE = 'Variable',
  IMPORT = 'Import',
  EXPORT = 'Export',
  PATTERN = 'Pattern',
  CONVERSATION = 'Conversation',
  MESSAGE = 'Message',
  INSIGHT = 'Insight',
  TODO = 'Todo',
  ERROR = 'Error',
  COMMIT = 'Commit',
  DEPENDENCY = 'Dependency',
  CONCEPT = 'Concept',
  TAG = 'Tag'
}

export enum RelationType {
  CONTAINS = 'CONTAINS',
  IMPORTS = 'IMPORTS',
  EXPORTS = 'EXPORTS',
  CALLS = 'CALLS',
  EXTENDS = 'EXTENDS',
  IMPLEMENTS = 'IMPLEMENTS',
  REFERENCES = 'REFERENCES',
  DEPENDS_ON = 'DEPENDS_ON',
  SIMILAR_TO = 'SIMILAR_TO',
  RELATES_TO = 'RELATES_TO',
  HAS_MESSAGE = 'HAS_MESSAGE',
  MODIFIED = 'MODIFIED',
  DISCOVERED = 'DISCOVERED',
  FOUND_IN = 'FOUND_IN',
  TAGGED_WITH = 'TAGGED_WITH',
  BELONGS_TO = 'BELONGS_TO',
  INSTANTIATES = 'INSTANTIATES',
  RETURNS = 'RETURNS',
  THROWS = 'THROWS',
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS'
}

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  created_at: number;
  updated_at: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface FileNode extends BaseNode {
  type: NodeType.FILE;
  path: string;
  content: string;
  hash: string;
  language: string;
  size: number;
  lines: number;
  complexity?: number;
  last_modified: number;
}

export interface FunctionNode extends BaseNode {
  type: NodeType.FUNCTION;
  signature: string;
  body: string;
  parameters: string[];
  return_type?: string;
  async: boolean;
  generator: boolean;
  complexity: number;
  line_start: number;
  line_end: number;
  file_path: string;
}

export interface ClassNode extends BaseNode {
  type: NodeType.CLASS;
  extends?: string;
  implements?: string[];
  abstract: boolean;
  methods: string[];
  properties: string[];
  line_start: number;
  line_end: number;
  file_path: string;
}

export interface PatternNode extends BaseNode {
  type: NodeType.PATTERN;
  pattern_type: string;
  description: string;
  template?: string;
  usage_count: number;
  confidence: number;
  examples: string[];
}

export interface ConversationNode extends BaseNode {
  type: NodeType.CONVERSATION;
  session_id: string;
  summary: string;
  timestamp: number;
  token_count: number;
  model: string;
}

export interface MessageNode extends BaseNode {
  type: NodeType.MESSAGE;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  token_count: number;
  conversation_id: string;
}

export interface InsightNode extends BaseNode {
  type: NodeType.INSIGHT;
  insight_type: 'bug' | 'optimization' | 'pattern' | 'security' | 'refactor' | 'documentation';
  description: string;
  confidence: number;
  discovered_at: number;
  source: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConceptNode extends BaseNode {
  type: NodeType.CONCEPT;
  description: string;
  domain: string;
  importance: number;
  related_files: string[];
}

export interface Relationship {
  from_id: string;
  to_id: string;
  type: RelationType;
  properties?: Record<string, any>;
  created_at: number;
  confidence?: number;
}