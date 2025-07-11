import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class ReportRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  requestedBy: number;

  @CreateDateColumn()
  requestedAt: Date;
} 