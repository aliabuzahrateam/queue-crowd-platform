import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Counter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  branchId: number;

  @Column()
  name: string;

  @Column()
  status: string;
} 