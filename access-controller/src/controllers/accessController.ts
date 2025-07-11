import { Request, Response } from "express";

export const logAccess = (req: Request, res: Response) => {
  res.send("Log access logic here");
};

export const listAccessLogs = (req: Request, res: Response) => {
  res.send("List access logs logic here");
}; 