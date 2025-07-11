import { Request, Response } from "express";
import { createUserService, listUsersService, updateUserService } from "../services/userService";

export const createUser = async (req: Request, res: Response) => {
  const user = await createUserService(req.body);
  res.json(user);
};

export const listUsers = async (req: Request, res: Response) => {
  const users = await listUsersService();
  res.json(users);
};

export const updateUser = async (req: Request, res: Response) => {
  const result = await updateUserService(Number(req.params.id), req.body);
  res.json(result);
}; 