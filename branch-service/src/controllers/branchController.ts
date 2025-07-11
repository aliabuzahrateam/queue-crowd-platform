import { Request, Response } from "express";
import { createBranchService, listBranchesService, updateBranchService } from "../services/branchService";

export const createBranch = async (req: Request, res: Response) => {
  const branch = await createBranchService(req.body);
  res.json(branch);
};

export const listBranches = async (req: Request, res: Response) => {
  const branches = await listBranchesService();
  res.json(branches);
};

export const updateBranch = async (req: Request, res: Response) => {
  const result = await updateBranchService(Number(req.params.id), req.body);
  res.json(result);
}; 