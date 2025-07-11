import { AppDataSource } from "../data-source";
import { Queue } from "../entity/Queue";

export const createQueueService = async (data: any) => {
  const repo = AppDataSource.getRepository(Queue);
  const queue = repo.create(data);
  return await repo.save(queue);
};

export const listQueuesService = async () => {
  const repo = AppDataSource.getRepository(Queue);
  return await repo.find();
};

export const updateQueueService = async (id: number, data: any) => {
  const repo = AppDataSource.getRepository(Queue);
  return await repo.update(id, data);
}; 