import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class VirtualQueueEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  serviceId: number;

  @Column()
  position: number;

  @Column({ type: "timestamp" })
  joinedAt: Date;
} 