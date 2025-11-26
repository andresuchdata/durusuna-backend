import { Router } from 'express';
import { authenticateMiddleware } from '../shared/middleware/authenticateMiddleware';
import { validate } from '../utils/validation';
import db from '../shared/database/connection';
import { 
  createAssessmentSchema,
  updateAssessmentSchema,
  createAssessmentGradeSchema,
  updateAssessmentGradeSchema,
  bulkUpdateGradesSchema,
  assessmentQuerySchema
} from '../schemas/assessmentSchemas';

const router = Router();

// All routes require authentication
router.use(authenticateMiddleware);

function sendErrorResponse(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// Assessment CRUD
router.get('/', getAssessments);
router.post('/', validate(createAssessmentSchema), createAssessment);
router.get('/:id', getAssessment);
router.patch('/:id', validate(updateAssessmentSchema), updateAssessment);
router.delete('/:id', deleteAssessment);

// Assessment publishing
router.post('/:id/publish', publishAssessment);
router.post('/:id/unpublish', unpublishAssessment);

// Assessment grades
router.get('/:id/grades', getAssessmentGrades);
router.post('/:id/grades', validate(createAssessmentGradeSchema), createAssessmentGrade);
router.patch('/:id/grades/bulk', validate(bulkUpdateGradesSchema), bulkUpdateGrades);
router.get('/:id/grades/:studentId', getStudentAssessmentGrade);
router.patch('/:id/grades/:studentId', validate(updateAssessmentGradeSchema), updateAssessmentGrade);

// Assessment statistics
router.get('/:id/stats', getAssessmentStats);

// Assessment templates (for copying across classes)
router.post('/:id/copy', copyAssessmentToClasses);

async function getAssessments(req: any, res: any) {
  try {
    const { error, value } = assessmentQuerySchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid query parameters',
        details: error.details.map((d: any) => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    const query = value || {};
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const user = req.user;

    const baseQuery = db('assessments')
      .join('class_offerings', 'assessments.class_offering_id', 'class_offerings.id')
      .join('classes', 'class_offerings.class_id', 'classes.id')
      .where('classes.school_id', user.school_id);

    if (query.class_offering_id) {
      baseQuery.andWhere('assessments.class_offering_id', query.class_offering_id);
    }
    if (query.type) {
      baseQuery.andWhere('assessments.type', query.type);
    }
    if (typeof query.is_published === 'boolean') {
      baseQuery.andWhere('assessments.is_published', query.is_published);
    }
    if (query.search) {
      baseQuery.andWhere('assessments.title', 'ilike', `%${query.search}%`);
    }

    const countRow = await baseQuery
      .clone()
      .countDistinct<{ count: string }>('assessments.id as count')
      .first();

    const total = countRow ? Number(countRow.count) : 0;

    const rows = await baseQuery
      .clone()
      .leftJoin('assessment_grades as ag', 'ag.assessment_id', 'assessments.id')
      .groupBy('assessments.id')
      .select(
        'assessments.*',
        db.raw('COUNT(DISTINCT ag.id) as grades_count'),
        db.raw("COUNT(DISTINCT CASE WHEN ag.status IN ('submitted','graded','returned') THEN ag.id END) as submitted_count"),
        db.raw("COUNT(DISTINCT CASE WHEN ag.status = 'graded' THEN ag.id END) as graded_count"),
        db.raw('AVG(ag.adjusted_score) as average_score')
      )
      .orderBy('assessments.due_date', 'asc')
      .limit(limit)
      .offset(offset);

    const assessments = rows.map((row: any) => ({
      ...row,
      max_score: row.max_score != null ? Number(row.max_score) : null,
      weight_override: row.weight_override != null ? Number(row.weight_override) : null,
      late_penalty_per_day: row.late_penalty_per_day != null ? Number(row.late_penalty_per_day) : null,
      grades_count: row.grades_count != null ? Number(row.grades_count) : 0,
      submitted_count: row.submitted_count != null ? Number(row.submitted_count) : 0,
      graded_count: row.graded_count != null ? Number(row.graded_count) : 0,
      average_score: row.average_score != null ? Number(row.average_score) : null
    }));

    res.json({
      assessments,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function createAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.createAssessment(req.body, req.user);
    res.status(201).json({ assessment });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.getAssessmentById(req.params.id, req.user);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json({ assessment });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function updateAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user);
    res.json({ assessment });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function deleteAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    await assessmentService.deleteAssessment(req.params.id, req.user);
    res.status(204).send();
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function publishAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.publishAssessment(req.params.id, req.user);
    res.json({ assessment });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function unpublishAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.unpublishAssessment(req.params.id, req.user);
    res.json({ assessment });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getAssessmentGrades(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.getAssessmentGrades(req.params.id, req.query, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function createAssessmentGrade(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const grade = await assessmentService.createAssessmentGrade(req.params.id, req.body, req.user);
    res.status(201).json({ grade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function bulkUpdateGrades(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.bulkUpdateGrades(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getStudentAssessmentGrade(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const grade = await assessmentService.getStudentAssessmentGrade(
      req.params.id, 
      req.params.studentId, 
      req.user
    );
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json({ grade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function updateAssessmentGrade(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const grade = await assessmentService.updateAssessmentGrade(
      req.params.id, 
      req.params.studentId, 
      req.body, 
      req.user
    );
    res.json({ grade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getAssessmentStats(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const stats = await assessmentService.getAssessmentStats(req.params.id, req.user);
    res.json(stats);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function copyAssessmentToClasses(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.copyAssessmentToClasses(
      req.params.id, 
      req.body.class_offering_ids, 
      req.user
    );
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

export default router;
