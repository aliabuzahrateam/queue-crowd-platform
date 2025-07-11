import { AppDataSource } from "../data-source";
import { Notification } from "../entity/Notification";

export const createNotificationService = async (data: any) => {
  const repo = AppDataSource.getRepository(Notification);
  const notification = repo.create(data);
  return await repo.save(notification);
};

export const listNotificationsService = async () => {
  const repo = AppDataSource.getRepository(Notification);
  return await repo.find();
}; 