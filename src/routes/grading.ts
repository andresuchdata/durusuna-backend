import { Router, type RequestHandler } from 'express';
import { authenticate } from '../shared/middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { validate } from '../utils/validation'
import { 
  createGradingComponentSchema,
  updateGradingComponentSchema,
  createGradingFormulaSchema,
  updateGradingFormulaSchema,
  computeGradesSchema,
  previewGradeSchema,
  overrideFinalGradeSchema
} from '../schemas/gradingSchemas';

const router = Router();

const authenticateMiddleware: RequestHandler = (req, res, next) => {
  void authenticate(req, res, next);
};

function sendErrorResponse(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(500).json({ error: message });
}

// All routes require authentication
router.use(authenticateMiddleware);

// Grading Components
router.get('/components', getGradingComponents);
router.post('/components', validate(createGradingComponentSchema), createGradingComponent);
router.get('/components/:id', getGradingComponent);
router.patch('/components/:id', validate(updateGradingComponentSchema), updateGradingComponent);
router.delete('/components/:id', deleteGradingComponent);

// Grading Formulas
router.get('/formulas', getGradingFormulas);
router.post('/formulas', validate(createGradingFormulaSchema), createGradingFormula);
router.get('/formulas/:id', getGradingFormula);
router.patch('/formulas/:id', validate(updateGradingFormulaSchema), updateGradingFormula);
router.delete('/formulas/:id', deleteGradingFormula);

// Formula validation and testing
router.post('/formulas/validate', validateGradingFormula);
router.post('/formulas/:id/test', testGradingFormula);

// Final Grades
router.get('/final-grades', getFinalGrades);
router.get('/final-grades/:studentId/:classOfferingId', getFinalGrade);
router.post('/final-grades/:studentId/:classOfferingId/override', 
  validate(overrideFinalGradeSchema), overrideFinalGrade);
router.delete('/final-grades/:studentId/:classOfferingId/override', removeGradeOverride);

// Grade Computation
router.post('/compute', validate(computeGradesSchema), computeGrades);
router.post('/preview', validate(previewGradeSchema), previewGrade);
router.get('/computations/:id', getGradeComputation);

// Publishing and Locking
router.post('/final-grades/publish', publishFinalGrades);
router.post('/final-grades/unpublish', unpublishFinalGrades);
router.post('/final-grades/lock', lockFinalGrades);
router.post('/final-grades/unlock', unlockFinalGrades);

// Reports and Analytics
router.get('/reports/class-summary/:classOfferingId', getClassGradingSummary);
router.get('/reports/student-transcript/:studentId', getStudentTranscript);
router.get('/reports/grade-distribution/:classOfferingId', getGradeDistribution);

async function getGradingComponents(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.getGradingComponents(req.query, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function createGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const component = await gradingService.createGradingComponent(req.body, req.user);
    res.status(201).json({ component });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const component = await gradingService.getGradingComponentById(req.params.id, req.user);
    if (!component) {
      return res.status(404).json({ error: 'Grading component not found' });
    }
    res.json({ component });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function updateGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const component = await gradingService.updateGradingComponent(req.params.id, req.body, req.user);
    res.json({ component });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function deleteGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    await gradingService.deleteGradingComponent(req.params.id, req.user);
    res.status(204).send();
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getGradingFormulas(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.getGradingFormulas(req.query, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function createGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const formula = await gradingService.createGradingFormula(req.body, req.user);
    res.status(201).json({ formula });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const formula = await gradingService.getGradingFormulaById(req.params.id, req.user);
    if (!formula) {
      return res.status(404).json({ error: 'Grading formula not found' });
    }
    res.json({ formula });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function updateGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const formula = await gradingService.updateGradingFormula(req.params.id, req.body, req.user);
    res.json({ formula });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function deleteGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    await gradingService.deleteGradingFormula(req.params.id, req.user);
    res.status(204).send();
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function validateGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const validation = await gradingService.validateGradingFormula(req.body, req.user);
    res.json(validation);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function testGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const testResult = await gradingService.testGradingFormula(req.params.id, req.body, req.user);
    res.json(testResult);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.getFinalGrades(req.query, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getFinalGrade(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const finalGrade = await gradingService.getFinalGrade(
      req.params.studentId, 
      req.params.classOfferingId, 
      req.user
    );
    if (!finalGrade) {
      return res.status(404).json({ error: 'Final grade not found' });
    }
    res.json({ final_grade: finalGrade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function overrideFinalGrade(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const finalGrade = await gradingService.overrideFinalGrade(
      req.params.studentId,
      req.params.classOfferingId,
      req.body,
      req.user
    );
    res.json({ final_grade: finalGrade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function removeGradeOverride(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const finalGrade = await gradingService.removeGradeOverride(
      req.params.studentId,
      req.params.classOfferingId,
      req.user
    );
    res.json({ final_grade: finalGrade });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function computeGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const computation = await gradingService.computeGrades(req.body, req.user);
    res.json(computation);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function previewGrade(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const preview = await gradingService.previewGrade(req.body, req.user);
    res.json(preview);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getGradeComputation(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const computation = await gradingService.getGradeComputation(req.params.id, req.user);
    if (!computation) {
      return res.status(404).json({ error: 'Grade computation not found' });
    }
    res.json({ computation });
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function publishFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.publishFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function unpublishFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.unpublishFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function lockFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.lockFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function unlockFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.unlockFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getClassGradingSummary(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const summary = await gradingService.getClassGradingSummary(req.params.classOfferingId, req.user);
    res.json(summary);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getStudentTranscript(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const transcript = await gradingService.getStudentTranscript(req.params.studentId, req.query, req.user);
    res.json(transcript);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

async function getGradeDistribution(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const distribution = await gradingService.getGradeDistribution(req.params.classOfferingId, req.user);
    res.json(distribution);
  } catch (error: unknown) {
    sendErrorResponse(res, error);
  }
}

export default router;
