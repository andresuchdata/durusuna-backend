import { Router } from 'express';
import { authenticateMiddleware } from '../shared/middleware/authenticateMiddleware';
import { validate } from '../utils/validation';
import { 
  createAssessmentSchema,
  updateAssessmentSchema,
  createAssessmentGradeSchema,
  updateAssessmentGradeSchema,
  bulkUpdateGradesSchema
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
    const { assessmentService } = req.services;
    const result = await assessmentService.getAssessments(req.query, req.user);
    res.json(result);
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
