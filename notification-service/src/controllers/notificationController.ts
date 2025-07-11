import { Request, Response } from "express";
import { createNotificationService, listNotificationsService } from "../services/notificationService";

export const createNotification = async (req: Request, res: Response) => {
  const notification = await createNotificationService(req.body);
  res.json(notification);
};

export const listNotifications = async (req: Request, res: Response) => {
  const notifications = await listNotificationsService();
  res.json(notifications);
}; 