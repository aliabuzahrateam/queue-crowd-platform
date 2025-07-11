import { Request, Response } from "express";
import { createReportRequestService, listReportRequestsService } from "../services/reportRequestService";

export const createReportRequest = async (req: Request, res: Response) => {
  const report = await createReportRequestService(req.body);
  res.json(report);
};

export const listReportRequests = async (req: Request, res: Response) => {
  const reports = await listReportRequestsService();
  res.json(reports);
}; 