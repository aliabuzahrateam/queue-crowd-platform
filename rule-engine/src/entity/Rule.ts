import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Rule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  target: string; // e.g. "service", "role", "time"

  @Column()
  condition: string; // e.g. "role=staff", "time>08:00"

  @Column()
  action: string; // e.g. "allow", "deny", "prioritize"

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 