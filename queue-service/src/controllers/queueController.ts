import { Request, Response } from "express";
import { createQueueService, listQueuesService, updateQueueService } from "../services/queueService";

export const createQueue = async (req: Request, res: Response) => {
  const queue = await createQueueService(req.body);
  res.json(queue);
};

export const listQueues = async (req: Request, res: Response) => {
  const queues = await listQueuesService();
  res.json(queues);
};

export const updateQueue = async (req: Request, res: Response) => {
  const result = await updateQueueService(Number(req.params.id), req.body);
  res.json(result);
}; 