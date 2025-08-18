import Joi from 'joi';

const gradingAggregatorSchema = Joi.object({
  type: Joi.string().valid('average', 'weighted_average', 'best_n', 'drop_lowest_k', 'latest', 'sum', 'max', 'min').required(),
  n: Joi.number().integer().min(1).optional(),
  k: Joi.number().integer().min(1).optional(),
  then: Joi.string().valid('average', 'sum').optional(),
  weights: Joi.alternatives().try(
    Joi.string().valid('equal', 'score_based'),
    Joi.array().items(Joi.number())
  ).optional(),
  missing_policy: Joi.string().valid('ignore', 'zero', 'fail_validation').required(),
  rounding: Joi.string().valid('none', 'half_up', 'half_down', 'bankers').optional(),
  decimal_places: Joi.number().integer().min(0).max(4).optional()
});

const gradingConditionSchema = Joi.object({
  condition: Joi.string().required(),
  formula: Joi.string().required(),
  description: Joi.string().optional()
});

export const createGradingComponentSchema = Joi.object({
  scope: Joi.string().valid('school', 'period', 'subject', 'class_offering').required(),
  scope_ref_id: Joi.string().uuid().optional(),
  key: Joi.string().min(1).max(50).required(),
  display_label: Joi.string().min(1).max(100).required(),
  source_type: Joi.string().valid('assignment', 'test', 'final_exam').required(),
  filters: Joi.object().optional(),
  aggregator: gradingAggregatorSchema.required()
});

export const updateGradingComponentSchema = Joi.object({
  key: Joi.string().min(1).max(50).optional(),
  display_label: Joi.string().min(1).max(100).optional(),
  source_type: Joi.string().valid('assignment', 'test', 'final_exam').optional(),
  filters: Joi.object().optional(),
  aggregator: gradingAggregatorSchema.optional(),
  is_active: Joi.boolean().optional()
});

export const createGradingFormulaSchema = Joi.object({
  scope: Joi.string().valid('school', 'period', 'subject', 'class_offering').required(),
  scope_ref_id: Joi.string().uuid().optional(),
  expression: Joi.string().min(1).required(),
  conditions: Joi.array().items(gradingConditionSchema).optional(),
  rounding_rule: Joi.string().valid('none', 'half_up', 'half_down', 'bankers', 'floor', 'ceil').default('half_up'),
  decimal_places: Joi.number().integer().min(0).max(4).default(2),
  pass_threshold: Joi.number().min(0).max(100).optional(),
  grade_boundaries: Joi.object().pattern(Joi.string(), Joi.number()).optional(),
  description: Joi.string().optional()
});

export const updateGradingFormulaSchema = Joi.object({
  expression: Joi.string().min(1).optional(),
  conditions: Joi.array().items(gradingConditionSchema).optional(),
  rounding_rule: Joi.string().valid('none', 'half_up', 'half_down', 'bankers', 'floor', 'ceil').optional(),
  decimal_places: Joi.number().integer().min(0).max(4).optional(),
  pass_threshold: Joi.number().min(0).max(100).optional(),
  grade_boundaries: Joi.object().pattern(Joi.string(), Joi.number()).optional(),
  description: Joi.string().optional(),
  is_active: Joi.boolean().optional()
});

export const overrideFinalGradeSchema = Joi.object({
  override_grade: Joi.number().min(0).max(100).required(),
  override_reason: Joi.string().min(1).required()
});

export const computeGradesSchema = Joi.object({
  scope: Joi.string().valid('class_offering', 'period', 'school').required(),
  scope_id: Joi.string().uuid().required(),
  student_ids: Joi.array().items(Joi.string().uuid()).optional(),
  force_recompute: Joi.boolean().default(false)
});

export const previewGradeSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  class_offering_id: Joi.string().uuid().required(),
  formula_override: Joi.string().optional(),
  component_overrides: Joi.object().pattern(Joi.string(), Joi.number()).optional()
});

export const gradingComponentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  scope: Joi.string().valid('school', 'period', 'subject', 'class_offering').optional(),
  scope_ref_id: Joi.string().uuid().optional(),
  source_type: Joi.string().valid('assignment', 'test', 'final_exam').optional(),
  is_active: Joi.boolean().optional()
});

export const gradingFormulaQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  scope: Joi.string().valid('school', 'period', 'subject', 'class_offering').optional(),
  scope_ref_id: Joi.string().uuid().optional(),
  is_active: Joi.boolean().optional()
});

export const finalGradeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  student_id: Joi.string().uuid().optional(),
  class_offering_id: Joi.string().uuid().optional(),
  is_published: Joi.boolean().optional(),
  is_locked: Joi.boolean().optional(),
  has_override: Joi.boolean().optional()
});

export const publishFinalGradesSchema = Joi.object({
  class_offering_ids: Joi.array().items(Joi.string().uuid()).optional(),
  student_ids: Joi.array().items(Joi.string().uuid()).optional(),
  scope: Joi.string().valid('class_offering', 'period', 'school').optional(),
  scope_id: Joi.string().uuid().optional()
});

export const lockFinalGradesSchema = Joi.object({
  class_offering_ids: Joi.array().items(Joi.string().uuid()).optional(),
  student_ids: Joi.array().items(Joi.string().uuid()).optional(),
  scope: Joi.string().valid('class_offering', 'period', 'school').optional(),
  scope_id: Joi.string().uuid().optional()
});
