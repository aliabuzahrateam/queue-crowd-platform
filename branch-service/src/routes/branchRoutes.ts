import { Router } from 'express';
import {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchesByLocation,
  getBranchStats
} from '../controllers/branchController';
import { validateBranchData, validateBranchUpdate } from '../middleware/validation';

const router = Router();

// POST /api/branches
router.post('/', validateBranchData, createBranch);

// GET /api/branches
router.get('/', getAllBranches);

// GET /api/branches/:id
router.get('/:id', getBranchById);

// PUT /api/branches/:id
router.put('/:id', validateBranchUpdate, updateBranch);

// DELETE /api/branches/:id
router.delete('/:id', deleteBranch);

// GET /api/branches/location/:location
router.get('/location/:location', getBranchesByLocation);

// GET /api/branches/:id/stats
router.get('/:id/stats', getBranchStats);

export default router; 