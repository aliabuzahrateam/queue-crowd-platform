import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class CrowdMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @Column({ type: "timestamp" })
  timestamp: Date;

  @Column()
  peopleCount: number;

  @Column({ nullable: true })
  density: number;

  @Column({ nullable: true })
  source: string;
} 