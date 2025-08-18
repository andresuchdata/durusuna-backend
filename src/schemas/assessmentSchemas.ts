import Joi from 'joi';

export const createAssessmentSchema = Joi.object({
  class_offering_id: Joi.string().uuid().required(),
  type: Joi.string().valid('assignment', 'test', 'final_exam').required(),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional(),
  max_score: Joi.number().positive().required(),
  weight_override: Joi.number().min(0).max(1).optional(),
  group_tag: Joi.string().max(50).optional(),
  sequence_no: Joi.number().integer().min(1).optional(),
  assigned_date: Joi.date().optional(),
  due_date: Joi.date().optional(),
  rubric: Joi.object().optional(),
  instructions: Joi.object().optional(),
  allow_late_submission: Joi.boolean().default(true),
  late_penalty_per_day: Joi.number().min(0).max(1).optional()
});

export const updateAssessmentSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional(),
  max_score: Joi.number().positive().optional(),
  weight_override: Joi.number().min(0).max(1).optional(),
  group_tag: Joi.string().max(50).optional(),
  sequence_no: Joi.number().integer().min(1).optional(),
  assigned_date: Joi.date().optional(),
  due_date: Joi.date().optional(),
  rubric: Joi.object().optional(),
  instructions: Joi.object().optional(),
  is_published: Joi.boolean().optional(),
  allow_late_submission: Joi.boolean().optional(),
  late_penalty_per_day: Joi.number().min(0).max(1).optional()
});

export const createAssessmentGradeSchema = Joi.object({
  assessment_id: Joi.string().uuid().required(),
  student_id: Joi.string().uuid().required(),
  score: Joi.number().min(0).optional(),
  status: Joi.string().valid('not_submitted', 'submitted', 'graded', 'returned', 'excused').optional(),
  feedback: Joi.string().optional(),
  rubric_scores: Joi.object().optional(),
  attachments: Joi.array().items(Joi.object()).optional()
});

export const updateAssessmentGradeSchema = Joi.object({
  score: Joi.number().min(0).optional(),
  status: Joi.string().valid('not_submitted', 'submitted', 'graded', 'returned', 'excused').optional(),
  feedback: Joi.string().optional(),
  rubric_scores: Joi.object().optional(),
  attachments: Joi.array().items(Joi.object()).optional()
});

export const bulkUpdateGradesSchema = Joi.object({
  grades: Joi.array().items(
    Joi.object({
      student_id: Joi.string().uuid().required(),
      score: Joi.number().min(0).optional(),
      status: Joi.string().valid('not_submitted', 'submitted', 'graded', 'returned', 'excused').optional(),
      feedback: Joi.string().optional(),
      rubric_scores: Joi.object().optional()
    })
  ).min(1).required()
});

export const assessmentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional(),
  class_offering_id: Joi.string().uuid().optional(),
  type: Joi.string().valid('assignment', 'test', 'final_exam').optional(),
  group_tag: Joi.string().optional(),
  is_published: Joi.boolean().optional(),
  created_by: Joi.string().uuid().optional(),
  due_date_from: Joi.date().optional(),
  due_date_to: Joi.date().optional()
});

export const assessmentGradeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  assessment_id: Joi.string().uuid().optional(),
  student_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('not_submitted', 'submitted', 'graded', 'returned', 'excused').optional(),
  is_late: Joi.boolean().optional(),
  graded_by: Joi.string().uuid().optional()
});
