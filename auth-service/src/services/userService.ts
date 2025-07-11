import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

export const createUserService = async (data: any) => {
  const repo = AppDataSource.getRepository(User);
  const user = repo.create(data);
  return await repo.save(user);
};

export const listUsersService = async () => {
  const repo = AppDataSource.getRepository(User);
  return await repo.find();
};

export const updateUserService = async (id: number, data: any) => {
  const repo = AppDataSource.getRepository(User);
  return await repo.update(id, data);
}; 