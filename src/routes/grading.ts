import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
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

// All routes require authentication
router.use(authenticateToken);

// Grading Components
router.get('/components', getGradingComponents);
router.post('/components', validateRequest(createGradingComponentSchema), createGradingComponent);
router.get('/components/:id', getGradingComponent);
router.patch('/components/:id', validateRequest(updateGradingComponentSchema), updateGradingComponent);
router.delete('/components/:id', deleteGradingComponent);

// Grading Formulas
router.get('/formulas', getGradingFormulas);
router.post('/formulas', validateRequest(createGradingFormulaSchema), createGradingFormula);
router.get('/formulas/:id', getGradingFormula);
router.patch('/formulas/:id', validateRequest(updateGradingFormulaSchema), updateGradingFormula);
router.delete('/formulas/:id', deleteGradingFormula);

// Formula validation and testing
router.post('/formulas/validate', validateGradingFormula);
router.post('/formulas/:id/test', testGradingFormula);

// Final Grades
router.get('/final-grades', getFinalGrades);
router.get('/final-grades/:studentId/:classOfferingId', getFinalGrade);
router.post('/final-grades/:studentId/:classOfferingId/override', 
  validateRequest(overrideFinalGradeSchema), overrideFinalGrade);
router.delete('/final-grades/:studentId/:classOfferingId/override', removeGradeOverride);

// Grade Computation
router.post('/compute', validateRequest(computeGradesSchema), computeGrades);
router.post('/preview', validateRequest(previewGradeSchema), previewGrade);
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const component = await gradingService.createGradingComponent(req.body, req.user);
    res.status(201).json({ component });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const component = await gradingService.updateGradingComponent(req.params.id, req.body, req.user);
    res.json({ component });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteGradingComponent(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    await gradingService.deleteGradingComponent(req.params.id, req.user);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getGradingFormulas(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.getGradingFormulas(req.query, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function createGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const formula = await gradingService.createGradingFormula(req.body, req.user);
    res.status(201).json({ formula });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updateGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const formula = await gradingService.updateGradingFormula(req.params.id, req.body, req.user);
    res.json({ formula });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function deleteGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    await gradingService.deleteGradingFormula(req.params.id, req.user);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function validateGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const validation = await gradingService.validateGradingFormula(req.body, req.user);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function testGradingFormula(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const testResult = await gradingService.testGradingFormula(req.params.id, req.body, req.user);
    res.json(testResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.getFinalGrades(req.query, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function computeGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const computation = await gradingService.computeGrades(req.body, req.user);
    res.json(computation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function previewGrade(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const preview = await gradingService.previewGrade(req.body, req.user);
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function publishFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.publishFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function unpublishFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.unpublishFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function lockFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.lockFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function unlockFinalGrades(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const result = await gradingService.unlockFinalGrades(req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getClassGradingSummary(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const summary = await gradingService.getClassGradingSummary(req.params.classOfferingId, req.user);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getStudentTranscript(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const transcript = await gradingService.getStudentTranscript(req.params.studentId, req.query, req.user);
    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getGradeDistribution(req: any, res: any) {
  try {
    const { gradingService } = req.services;
    const distribution = await gradingService.getGradeDistribution(req.params.classOfferingId, req.user);
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export default router;
