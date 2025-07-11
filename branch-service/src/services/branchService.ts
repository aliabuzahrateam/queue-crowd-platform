import { AppDataSource } from "../data-source";
import { Branch } from "../entity/Branch";

export const createBranchService = async (data: any) => {
  const repo = AppDataSource.getRepository(Branch);
  const branch = repo.create(data);
  return await repo.save(branch);
};

export const listBranchesService = async () => {
  const repo = AppDataSource.getRepository(Branch);
  return await repo.find();
};

export const updateBranchService = async (id: number, data: any) => {
  const repo = AppDataSource.getRepository(Branch);
  return await repo.update(id, data);
}; 