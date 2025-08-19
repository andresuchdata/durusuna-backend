import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { 
  createAssessmentSchema,
  updateAssessmentSchema,
  createAssessmentGradeSchema,
  updateAssessmentGradeSchema,
  bulkUpdateGradesSchema
} from '../schemas/assessmentSchemas';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Assessment CRUD
router.get('/', getAssessments);
router.post('/', validateRequest(createAssessmentSchema), createAssessment);
router.get('/:id', getAssessment);
router.patch('/:id', validateRequest(updateAssessmentSchema), updateAssessment);
router.delete('/:id', deleteAssessment);

// Assessment publishing
router.post('/:id/publish', publishAssessment);
router.post('/:id/unpublish', unpublishAssessment);

// Assessment grades
router.get('/:id/grades', getAssessmentGrades);
router.post('/:id/grades', validateRequest(createAssessmentGradeSchema), createAssessmentGrade);
router.patch('/:id/grades/bulk', validateRequest(bulkUpdateGradesSchema), bulkUpdateGrades);
router.get('/:id/grades/:studentId', getStudentAssessmentGrade);
router.patch('/:id/grades/:studentId', validateRequest(updateAssessmentGradeSchema), updateAssessmentGrade);

// Assessment statistics
router.get('/:id/stats', getAssessmentStats);

// Assessment templates (for copying across classes)
router.post('/:id/copy', copyAssessmentToClasses);

async function getAssessments(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.getAssessments(req.query, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.createAssessment(req.body, req.user);
    res.status(201).json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.updateAssessment(req.params.id, req.body, req.user);
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    await assessmentService.deleteAssessment(req.params.id, req.user);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function publishAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.publishAssessment(req.params.id, req.user);
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function unpublishAssessment(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const assessment = await assessmentService.unpublishAssessment(req.params.id, req.user);
    res.json({ assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getAssessmentGrades(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.getAssessmentGrades(req.params.id, req.query, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createAssessmentGrade(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const grade = await assessmentService.createAssessmentGrade(req.params.id, req.body, req.user);
    res.status(201).json({ grade });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function bulkUpdateGrades(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const result = await assessmentService.bulkUpdateGrades(req.params.id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getAssessmentStats(req: any, res: any) {
  try {
    const { assessmentService } = req.services;
    const stats = await assessmentService.getAssessmentStats(req.params.id, req.user);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default router;
