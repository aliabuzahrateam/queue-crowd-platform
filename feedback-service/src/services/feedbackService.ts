import { AppDataSource } from "../data-source";
import { Feedback } from "../entity/Feedback";

export const createFeedbackService = async (data: any) => {
  const repo = AppDataSource.getRepository(Feedback);
  const feedback = repo.create(data);
  return await repo.save(feedback);
};

export const listFeedbackService = async () => {
  const repo = AppDataSource.getRepository(Feedback);
  return await repo.find();
}; 