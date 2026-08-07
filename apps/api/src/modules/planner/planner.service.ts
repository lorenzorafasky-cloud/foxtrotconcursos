import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class PlannerService {
  constructor(private readonly prisma: PrismaService) {}

  lists(userId: string) {
    return this.prisma.studyList.findMany({
      where: { userId },
      include: { tasks: { where: { parentId: null }, include: { subtasks: true }, orderBy: { dueDate: "asc" } } },
      orderBy: [{ isMyDay: "desc" }, { createdAt: "asc" }]
    });
  }

  createList(userId: string, title: string) {
    return this.prisma.studyList.create({ data: { userId, title } });
  }

  createTask(
    listId: string,
    data: {
      title: string;
      dueDate?: string;
      priority?: "LOW" | "NORMAL" | "HIGH" | "STARRED";
      recurrence?: string;
      subjectId?: string;
      topicId?: string;
      parentId?: string;
    }
  ) {
    return this.prisma.studyTask.create({
      data: {
        listId,
        title: data.title,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority ?? "NORMAL",
        recurrence: data.recurrence,
        subjectId: data.subjectId,
        topicId: data.topicId,
        parentId: data.parentId
      }
    });
  }

  completeTask(id: string, completed: boolean) {
    return this.prisma.studyTask.update({
      where: { id },
      data: { completedAt: completed ? new Date() : null }
    });
  }
}
