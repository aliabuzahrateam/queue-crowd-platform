import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class QueueEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  queueTicketId: number;

  @Column()
  eventType: string;

  @Column({ type: "timestamp" })
  timestamp: Date;

  @Column({ nullable: true })
  details: string;
} 