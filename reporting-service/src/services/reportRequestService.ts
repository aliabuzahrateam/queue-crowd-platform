import { AppDataSource } from "../data-source";
import { ReportRequest } from "../entity/ReportRequest";

export const createReportRequestService = async (data: any) => {
  const repo = AppDataSource.getRepository(ReportRequest);
  const report = repo.create(data);
  return await repo.save(report);
};

export const listReportRequestsService = async () => {
  const repo = AppDataSource.getRepository(ReportRequest);
  return await repo.find();
}; 