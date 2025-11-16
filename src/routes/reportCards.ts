import express, { Request, Response } from 'express';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import db from '../shared/database/connection';
import { ReportCardService } from '../services/reportCardService';
import { GenerateReportCardsRequest, ListReportCardsQuery } from '../types/reportCard';
import logger from '../shared/utils/logger';

const router = express.Router();
const reportCardService = new ReportCardService(db);

router.post('/generate', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const payload = req.body as GenerateReportCardsRequest;

    if (!payload.class_id || !payload.academic_period_id) {
      res.status(400).json({ error: 'class_id and academic_period_id are required' });
      return;
    }

    const result = await reportCardService.generateReportCards(payload, authenticatedReq.user);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Admin access required')) {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message.includes('not found') || error.message.includes('Access denied')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    logger.error('Error generating report cards:', error);
    res.status(500).json({ error: 'Failed to generate report cards' });
  }
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const query = req.query as any;
    const params: ListReportCardsQuery = {
      class_id: query.class_id,
      academic_period_id: query.academic_period_id,
      student_id: query.student_id,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    };

    if (!params.class_id || !params.academic_period_id) {
      res.status(400).json({ error: 'class_id and academic_period_id are required' });
      return;
    }

    const result = await reportCardService.listReportCards(params, authenticatedReq.user);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Admin access required')) {
      res.status(403).json({ error: error.message });
      return;
    }

    logger.error('Error listing report cards:', error);
    res.status(500).json({ error: 'Failed to list report cards' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Report card ID is required' });
      return;
    }

    const reportCard = await reportCardService.getReportCardById(id, authenticatedReq.user);
    res.json({ report_card: reportCard });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('Access denied')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }

    logger.error('Error fetching report card:', error);
    res.status(500).json({ error: 'Failed to fetch report card' });
  }
});

export default router;
