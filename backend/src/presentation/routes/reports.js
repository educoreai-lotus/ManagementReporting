import express from 'express';
import { authenticate } from '../middleware/authentication.js';
import { authorizeAdmin } from '../middleware/authorization.js';
import { validateReportGeneration, sanitizeInput } from '../validators/inputValidator.js';
import { ReportsController } from '../controllers/ReportsController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeAdmin);
router.use(sanitizeInput);

const controller = new ReportsController();

router.get('/types', controller.getReportTypes.bind(controller));
router.post('/generate', validateReportGeneration, controller.generateReport.bind(controller));

export default router;

