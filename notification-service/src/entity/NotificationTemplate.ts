import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  content: string;
} 