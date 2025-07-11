import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class QueueTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  queueId: number;

  @Column()
  userId: number;

  @Column()
  number: number;

  @Column()
  status: string;

  @Column({ type: "timestamp", nullable: true })
  issuedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  servedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  cancelledAt: Date;
} 