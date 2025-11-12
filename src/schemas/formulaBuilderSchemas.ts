import Joi from 'joi';

const positionSchema = Joi.object({
  x: Joi.number().required(),
  y: Joi.number().required()
});

const componentNodeSchema = Joi.object({
  component_key: Joi.string().required(),
  display_name: Joi.string().required(),
  source_type: Joi.string().valid('assignment', 'test', 'final_exam').required(),
  color: Joi.string().optional(),
  icon: Joi.string().optional(),
  description: Joi.string().optional()
});

const operatorNodeSchema = Joi.object({
  operator: Joi.string().valid('+', '-', '*', '/', '^', '%').required(),
  display_symbol: Joi.string().required(),
  precedence: Joi.number().integer().required()
});

const valueNodeSchema = Joi.object({
  value: Joi.number().required(),
  display_value: Joi.string().required(),
  is_percentage: Joi.boolean().optional(),
  is_weight: Joi.boolean().optional()
});

const conditionNodeSchema = Joi.object({
  condition_type: Joi.string().valid('if', 'else_if', 'else').required(),
  condition_expression: Joi.string().optional(),
  display_text: Joi.string().required()
});

const parenthesisNodeSchema = Joi.object({
  parenthesis_type: Joi.string().valid('open', 'close').required(),
  display_symbol: Joi.string().valid('(', ')').required(),
  group_id: Joi.string().optional()
});

const nodeDataSchema = Joi.when('type', {
  switch: [
    { is: 'component', then: componentNodeSchema },
    { is: 'operator', then: operatorNodeSchema },
    { is: 'value', then: valueNodeSchema },
    { is: 'condition', then: conditionNodeSchema },
    { is: 'parenthesis', then: parenthesisNodeSchema }
  ],
  otherwise: Joi.object().unknown(true)
});

const formulaNodeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid('component', 'operator', 'value', 'condition', 'parenthesis').required(),
  position: positionSchema.required(),
  data: nodeDataSchema.required()
});

const connectionStyleSchema = Joi.object({
  color: Joi.string().optional(),
  width: Joi.number().optional(),
  style: Joi.string().valid('solid', 'dashed', 'dotted').optional(),
  label: Joi.string().optional()
});

const connectionSchema = Joi.object({
  id: Joi.string().required(),
  from_node: Joi.string().required(),
  to_node: Joi.string().required(),
  connection_type: Joi.string().valid('flow', 'condition_true', 'condition_false').required(),
  display_style: connectionStyleSchema.optional()
});

const canvasSettingsSchema = Joi.object({
  width: Joi.number().required(),
  height: Joi.number().required(),
  zoom: Joi.number().required(),
  grid_size: Joi.number().optional(),
  snap_to_grid: Joi.boolean().optional(),
  background_color: Joi.string().optional()
});

const visualFormulaStructureSchema = Joi.object({
  nodes: Joi.array().items(formulaNodeSchema).min(1).required(),
  connections: Joi.array().items(connectionSchema).required(),
  result_node_id: Joi.string().required(),
  canvas_settings: canvasSettingsSchema.optional()
});

const customValidationRuleSchema = Joi.object({
  rule_type: Joi.string().valid('component_count', 'weight_range', 'expression_complexity').required(),
  parameters: Joi.object().unknown(true).required(),
  error_message: Joi.string().required()
});

const validationRulesSchema = Joi.object({
  required_components: Joi.array().items(Joi.string()).optional(),
  forbidden_components: Joi.array().items(Joi.string()).optional(),
  max_nodes: Joi.number().integer().min(1).optional(),
  min_nodes: Joi.number().integer().min(0).optional(),
  allowed_operators: Joi.array().items(Joi.string()).optional(),
  require_final_exam: Joi.boolean().optional(),
  min_weight_sum: Joi.number().optional(),
  max_weight_sum: Joi.number().optional(),
  custom_rules: Joi.array().items(customValidationRuleSchema).optional()
});

export const createFormulaTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  visual_structure: visualFormulaStructureSchema.required(),
  category: Joi.string().valid('basic', 'islamic', 'advanced', 'custom').default('custom'),
  is_public: Joi.boolean().default(false),
  validation_rules: validationRulesSchema.optional()
});

export const updateFormulaTemplateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  visual_structure: visualFormulaStructureSchema.optional(),
  category: Joi.string().valid('basic', 'islamic', 'advanced', 'custom').optional(),
  is_public: Joi.boolean().optional(),
  validation_rules: validationRulesSchema.optional()
}).min(1);

export const validateFormulaSchema = Joi.object({
  visual_structure: visualFormulaStructureSchema.required(),
  scope: Joi.string().valid('school', 'period', 'subject', 'class_offering').required(),
  scope_ref_id: Joi.string().optional(),
  metadata: Joi.object().unknown(true).optional()
});

export const convertToExpressionSchema = Joi.object({
  visual_structure: visualFormulaStructureSchema.required(),
  output_format: Joi.string().valid('math', 'readable', 'code').default('math')
});
