import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  type: string;

  @Column()
  content: string;

  @Column()
  status: string;

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;
} 