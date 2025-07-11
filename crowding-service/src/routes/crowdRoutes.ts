import { Router } from 'express';
import {
  recordCrowdData,
  getCurrentCrowd,
  getCrowdHistory,
  getCrowdAnalytics,
  getActiveAlerts,
  resolveAlert
} from '../controllers/crowdController';
import { validateCrowdData, validateCrowdQuery, validateAlertResolution } from '../middleware/validation';
import { SecurityMiddleware, rateLimitConfigs } from '../middleware/security';

const router = Router();

// POST /api/crowd/record
router.post('/record', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.crowdData),
  SecurityMiddleware.abuseDetection(),
  SecurityMiddleware.validateCrowdData(),
  validateCrowdData, 
  recordCrowdData
);

// GET /api/crowd/current/:branch_id
router.get('/current/:branch_id', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.general),
  getCurrentCrowd
);

// GET /api/crowd/history/:branch_id
router.get('/history/:branch_id', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.analytics),
  validateCrowdQuery, 
  getCrowdHistory
);

// GET /api/crowd/analytics/:branch_id
router.get('/analytics/:branch_id', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.analytics),
  getCrowdAnalytics
);

// GET /api/crowd/alerts
router.get('/alerts', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.general),
  getActiveAlerts
);

// PUT /api/crowd/alerts/:id/resolve
router.put('/alerts/:id/resolve', 
  SecurityMiddleware.ipBlock(),
  SecurityMiddleware.rateLimit(rateLimitConfigs.general),
  validateAlertResolution, 
  resolveAlert
);

// Admin routes for IP management
// GET /api/crowd/admin/blocked-ips
router.get('/admin/blocked-ips', (req, res) => {
  const blockedIPs = SecurityMiddleware.getBlockedIPs();
  return res.json({
    success: true,
    data: { blockedIPs }
  });
});

// POST /api/crowd/admin/block-ip
router.post('/admin/block-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid IP address'
    });
  }
  
  SecurityMiddleware.addBlockedIP(ip);
  return res.json({
    success: true,
    message: `IP ${ip} has been blocked`
  });
});

// DELETE /api/crowd/admin/unblock-ip/:ip
router.delete('/admin/unblock-ip/:ip', (req, res) => {
  const { ip } = req.params;
  SecurityMiddleware.removeBlockedIP(ip);
  return res.json({
    success: true,
    message: `IP ${ip} has been unblocked`
  });
});

export default router; 