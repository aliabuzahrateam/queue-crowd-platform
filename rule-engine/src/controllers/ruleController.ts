import { Request, Response } from "express";

export const createRule = (req: Request, res: Response) => {
  res.send("Create rule logic here");
};

export const listRules = (req: Request, res: Response) => {
  res.send("List rules logic here");
};

export const updateRule = (req: Request, res: Response) => {
  res.send("Update rule logic here");
}; 