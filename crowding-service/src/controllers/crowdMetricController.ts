import { Request, Response } from "express";
import { createCrowdMetricService, listCrowdMetricsService } from "../services/crowdMetricService";

export const createCrowdMetric = async (req: Request, res: Response) => {
  const metric = await createCrowdMetricService(req.body);
  res.json(metric);
};

export const listCrowdMetrics = async (req: Request, res: Response) => {
  const metrics = await listCrowdMetricsService();
  res.json(metrics);
}; 