import { AppDataSource } from "../data-source";
import { CrowdMetric } from "../entity/CrowdMetric";

export const createCrowdMetricService = async (data: any) => {
  const repo = AppDataSource.getRepository(CrowdMetric);
  const metric = repo.create(data);
  return await repo.save(metric);
};

export const listCrowdMetricsService = async () => {
  const repo = AppDataSource.getRepository(CrowdMetric);
  return await repo.find();
}; 