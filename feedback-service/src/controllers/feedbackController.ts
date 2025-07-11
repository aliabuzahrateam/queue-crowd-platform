import { Request, Response } from "express";
import { createFeedbackService, listFeedbackService } from "../services/feedbackService";

export const createFeedback = async (req: Request, res: Response) => {
  const feedback = await createFeedbackService(req.body);
  res.json(feedback);
};

export const listFeedback = async (req: Request, res: Response) => {
  const feedbacks = await listFeedbackService();
  res.json(feedbacks);
}; 