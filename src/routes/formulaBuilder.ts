import { Router } from 'express';
import { validate } from '../utils/validation';
import { authenticateMiddleware } from '@/shared/middleware/authenticateMiddleware';
import { 
  createFormulaTemplateSchema,
  updateFormulaTemplateSchema,
  validateFormulaSchema,
  convertToExpressionSchema
} from '../schemas/formulaBuilderSchemas';

const router = Router();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

function handleError(res: any, error: unknown) {
  res.status(500).json({ error: getErrorMessage(error) });
}

// All routes require authentication
router.use(authenticateMiddleware);

// Formula Templates CRUD
router.get('/templates', getFormulaTemplates);
router.post('/templates', validate(createFormulaTemplateSchema), createFormulaTemplate);
router.get('/templates/:id', getFormulaTemplate);
router.patch('/templates/:id', validate(updateFormulaTemplateSchema), updateFormulaTemplate);
router.delete('/templates/:id', deleteFormulaTemplate);

// Template Operations
router.post('/templates/:id/duplicate', duplicateFormulaTemplate);
router.post('/templates/:id/apply', applyTemplateToFormula);

// Formula Conversion & Validation
router.post('/validate', validate(validateFormulaSchema), validateFormula);
router.post('/convert', validate(convertToExpressionSchema), convertToExpression);
router.post('/preview', previewFormulaCalculation);

// Component Library
router.get('/components/library', getComponentLibrary);
router.get('/components/available', getAvailableComponents);

// Pre-built Templates
router.get('/templates/prebuilt/islamic', getIslamicTemplates);
router.get('/templates/prebuilt/basic', getBasicTemplates);

// Formula Builder UI Configuration
router.get('/config/ui', getUIConfiguration);
router.get('/config/validation-rules', getValidationRules);

async function getFormulaTemplates(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const result = await formulaBuilderService.getFormulaTemplates(req.query, req.user);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
}

async function createFormulaTemplate(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const template = await formulaBuilderService.createFormulaTemplate(req.body, req.user);
    res.status(201).json({ template });
  } catch (error) {
    handleError(res, error);
  }
}

async function getFormulaTemplate(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const template = await formulaBuilderService.getFormulaTemplateById(req.params.id, req.user);
    if (!template) {
      return res.status(404).json({ error: 'Formula template not found' });
    }
    res.json({ template });
  } catch (error) {
    handleError(res, error);
  }
}

async function updateFormulaTemplate(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const template = await formulaBuilderService.updateFormulaTemplate(req.params.id, req.body, req.user);
    res.json({ template });
  } catch (error) {
    handleError(res, error);
  }
}

async function deleteFormulaTemplate(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    await formulaBuilderService.deleteFormulaTemplate(req.params.id, req.user);
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
}

async function duplicateFormulaTemplate(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const newTemplate = await formulaBuilderService.duplicateFormulaTemplate(
      req.params.id, 
      req.body.new_name, 
      req.user
    );
    res.status(201).json({ template: newTemplate });
  } catch (error) {
    handleError(res, error);
  }
}

async function applyTemplateToFormula(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const formula = await formulaBuilderService.applyTemplateToFormula(
      req.params.id,
      req.body.scope,
      req.body.scope_ref_id,
      req.user
    );
    res.json({ formula });
  } catch (error) {
    handleError(res, error);
  }
}

async function validateFormula(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const validation = await formulaBuilderService.validateFormula(req.body, req.user);
    res.json(validation);
  } catch (error) {
    handleError(res, error);
  }
}

async function convertToExpression(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const conversion = await formulaBuilderService.convertToExpression(req.body, req.user);
    res.json(conversion);
  } catch (error) {
    handleError(res, error);
  }
}

async function previewFormulaCalculation(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const preview = await formulaBuilderService.previewFormulaCalculation(req.body, req.user);
    res.json(preview);
  } catch (error) {
    handleError(res, error);
  }
}

async function getComponentLibrary(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const library = await formulaBuilderService.getComponentLibrary(req.query, req.user);
    res.json(library);
  } catch (error) {
    handleError(res, error);
  }
}

async function getAvailableComponents(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const components = await formulaBuilderService.getAvailableComponents(req.query, req.user);
    res.json({ components });
  } catch (error) {
    handleError(res, error);
  }
}

async function getIslamicTemplates(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const templates = await formulaBuilderService.getIslamicTemplates(req.user);
    res.json({ templates });
  } catch (error) {
    handleError(res, error);
  }
}

async function getBasicTemplates(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const templates = await formulaBuilderService.getBasicTemplates(req.user);
    res.json({ templates });
  } catch (error) {
    handleError(res, error);
  }
}

async function getUIConfiguration(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const config = await formulaBuilderService.getUIConfiguration(req.user);
    res.json(config);
  } catch (error) {
    handleError(res, error);
  }
}

async function getValidationRules(req: any, res: any) {
  try {
    const { formulaBuilderService } = req.services;
    const rules = await formulaBuilderService.getValidationRules(req.query, req.user);
    res.json(rules);
  } catch (error) {
    handleError(res, error);
  }
}

export default router;
