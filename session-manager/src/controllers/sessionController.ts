import { Request, Response } from "express";

export const createSession = (req: Request, res: Response) => {
  res.send("Create session logic here");
};

export const listSessions = (req: Request, res: Response) => {
  res.send("List sessions logic here");
};

export const revokeSession = (req: Request, res: Response) => {
  res.send("Revoke session logic here");
}; 