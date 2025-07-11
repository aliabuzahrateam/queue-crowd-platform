import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  service: string;

  @Column()
  action: string; // allowed, denied

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  reason: string;
} 