// Visual Formula Builder Types for Drag-Drop UI

export interface FormulaNode {
  id: string;
  type: 'component' | 'operator' | 'value' | 'condition' | 'parenthesis';
  position: Position;
  data: ComponentNode | OperatorNode | ValueNode | ConditionNode | ParenthesisNode;
}

export interface Position {
  x: number;
  y: number;
}

export interface ComponentNode {
  component_key: string;
  display_name: string;
  source_type: 'assignment' | 'test' | 'final_exam';
  color?: string;
  icon?: string;
  description?: string;
}

export interface OperatorNode {
  operator: '+' | '-' | '*' | '/' | '^' | '%';
  display_symbol: string;
  precedence: number;
}

export interface ValueNode {
  value: number;
  display_value: string;
  is_percentage?: boolean;
  is_weight?: boolean;
}

export interface ConditionNode {
  condition_type: 'if' | 'else_if' | 'else';
  condition_expression?: string; // e.g., "uas < 60"
  display_text: string;
}

export interface ParenthesisNode {
  parenthesis_type: 'open' | 'close';
  display_symbol: '(' | ')';
  group_id?: string; // To match opening/closing pairs
}

export interface FormulaConnection {
  id: string;
  from_node: string;
  to_node: string;
  connection_type: 'flow' | 'condition_true' | 'condition_false';
  display_style?: ConnectionStyle;
}

export interface ConnectionStyle {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: string;
}

export interface VisualFormulaStructure {
  nodes: FormulaNode[];
  connections: FormulaConnection[];
  result_node_id: string;
  canvas_settings?: CanvasSettings;
}

export interface CanvasSettings {
  width: number;
  height: number;
  zoom: number;
  grid_size?: number;
  snap_to_grid?: boolean;
  background_color?: string;
}

// Formula Template Types
export interface FormulaTemplate {
  id: string;
  school_id?: string;
  name: string;
  description?: string;
  visual_structure: VisualFormulaStructure;
  generated_expression: string;
  validation_rules: ValidationRules;
  category: 'basic' | 'islamic' | 'advanced' | 'custom';
  is_template: boolean;
  is_public: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ValidationRules {
  required_components?: string[]; // Must include these components
  forbidden_components?: string[]; // Cannot include these
  max_nodes?: number;
  min_nodes?: number;
  allowed_operators?: string[];
  require_final_exam?: boolean;
  min_weight_sum?: number;
  max_weight_sum?: number;
  custom_rules?: CustomValidationRule[];
}

export interface CustomValidationRule {
  rule_type: 'component_count' | 'weight_range' | 'expression_complexity';
  parameters: Record<string, any>;
  error_message: string;
}

// Drag-Drop UI Component Types
export interface DraggableItem {
  id: string;
  type: 'component' | 'operator' | 'value' | 'condition';
  display_name: string;
  icon?: string;
  color?: string;
  category: string;
  description?: string;
  default_data: any;
}

export interface DropZoneConfig {
  id: string;
  accepts: string[]; // Node types that can be dropped
  max_items?: number;
  validation_rules?: string[];
}

// Mobile UI Specific Types
export interface FormulaBuilderState {
  canvas: VisualFormulaStructure;
  selected_node_id?: string;
  is_dragging: boolean;
  drag_item?: DraggableItem;
  zoom_level: number;
  is_preview_mode: boolean;
  validation_errors: ValidationError[];
  computed_result?: FormulaPreviewResult;
}

export interface ValidationError {
  node_id?: string;
  connection_id?: string;
  error_type: 'missing_connection' | 'invalid_operator' | 'missing_component' | 'circular_dependency';
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface FormulaPreviewResult {
  expression: string;
  sample_calculation: string;
  estimated_result: number;
  component_contributions: ComponentContribution[];
  warnings?: string[];
}

export interface ComponentContribution {
  component_key: string;
  display_name: string;
  sample_value: number;
  weight: number;
  contribution: number;
  percentage: number;
}

// API Request/Response Types
export interface CreateFormulaTemplateRequest {
  name: string;
  description?: string;
  visual_structure: VisualFormulaStructure;
  category?: 'basic' | 'islamic' | 'advanced' | 'custom';
  is_public?: boolean;
  validation_rules?: ValidationRules;
}

export interface UpdateFormulaTemplateRequest {
  name?: string;
  description?: string;
  visual_structure?: VisualFormulaStructure;
  category?: 'basic' | 'islamic' | 'advanced' | 'custom';
  is_public?: boolean;
  validation_rules?: ValidationRules;
}

export interface ValidateFormulaRequest {
  visual_structure: VisualFormulaStructure;
  scope: 'school' | 'period' | 'subject' | 'class_offering';
  scope_ref_id?: string;
}

export interface ConvertToExpressionRequest {
  visual_structure: VisualFormulaStructure;
  output_format?: 'math' | 'readable' | 'code';
}

export interface FormulaTemplateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: 'basic' | 'islamic' | 'advanced' | 'custom';
  is_template?: boolean;
  is_public?: boolean;
  school_id?: string;
  created_by?: string;
}

export interface FormulaTemplatesResponse {
  templates: FormulaTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ValidateFormulaResponse {
  is_valid: boolean;
  generated_expression: string;
  validation_errors: ValidationError[];
  preview_result?: FormulaPreviewResult;
  suggestions?: string[];
}

export interface ConvertToExpressionResponse {
  expression: string;
  readable_format: string;
  validation_status: 'valid' | 'invalid' | 'warning';
  complexity_score: number;
  estimated_performance: 'fast' | 'moderate' | 'slow';
}

// Pre-built Template Categories for Islamic Schools
export interface IslamicFormulaTemplates {
  basic_weighted: FormulaTemplate;
  uas_dominant: FormulaTemplate; // UAS score overrides if < 60
  best_of_tests: FormulaTemplate; // Take best N test scores
  progressive_weight: FormulaTemplate; // Increasing weights through semester
  akhlak_bonus: FormulaTemplate; // Character bonus for Islamic subjects
  hafalan_component: FormulaTemplate; // Quran memorization weighting
}

// Component Library for Drag-Drop
export interface ComponentLibrary {
  assessment_components: DraggableItem[];
  operators: DraggableItem[];
  values: DraggableItem[];
  conditions: DraggableItem[];
  functions: DraggableItem[];
}

export interface AssessmentComponentItem extends DraggableItem {
  component_key: string;
  source_type: 'assignment' | 'test' | 'final_exam';
  aggregation_type: string;
  islamic_context?: boolean;
}

// Real-time Collaboration Types (Future Enhancement)
export interface FormulaCollaboration {
  session_id: string;
  participants: CollaborationParticipant[];
  changes: FormulaChange[];
  last_sync: Date;
}

export interface CollaborationParticipant {
  user_id: string;
  user_name: string;
  role: 'owner' | 'editor' | 'viewer';
  cursor_position?: Position;
  selected_node_id?: string;
  is_active: boolean;
}

export interface FormulaChange {
  id: string;
  user_id: string;
  change_type: 'add_node' | 'remove_node' | 'move_node' | 'add_connection' | 'remove_connection';
  timestamp: Date;
  data: any;
}
