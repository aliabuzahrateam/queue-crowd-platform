import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ServiceType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;
} 