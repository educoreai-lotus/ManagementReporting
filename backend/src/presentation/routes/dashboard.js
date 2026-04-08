import express from 'express';
import { authenticate } from '../middleware/authentication.js';
import { authorizeAdmin } from '../middleware/authorization.js';
import { DashboardController } from '../controllers/DashboardController.js';
import { BoxController } from '../controllers/BoxController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeAdmin);

const dashboardController = new DashboardController();
const boxController = new BoxController();

// Dashboard routes
router.get('/', dashboardController.getDashboard.bind(dashboardController));
router.get('/all-charts', dashboardController.getAllCharts.bind(dashboardController)); // All charts for transcription
router.post('/refresh', dashboardController.refreshData.bind(dashboardController));
router.get('/chart/:chartId', dashboardController.getChart.bind(dashboardController));
router.post('/chart/:chartId/refresh', dashboardController.refreshChart.bind(dashboardController));
router.post('/chart/:chartId/filter', dashboardController.getFilteredChart.bind(dashboardController));
router.get('/chart/:chartId/pdf', dashboardController.downloadChartPDF.bind(dashboardController));
router.post('/chart/:chartId/pdf', dashboardController.downloadChartPDF.bind(dashboardController));
router.get('/courses', dashboardController.getCourses.bind(dashboardController));

// BOX routes
router.get('/box/charts', boxController.getCharts.bind(boxController));
router.get('/box/charts/search', boxController.searchCharts.bind(boxController));

export default router;
