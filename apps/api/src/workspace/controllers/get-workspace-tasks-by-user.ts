import { and, asc, eq } from "drizzle-orm";
import db from "../../database";
import {
  columnTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";

type TaskEntry = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  projectId: string;
  columnColor: string | null;
};

type ProjectEntry = {
  id: string;
  name: string;
  slug: string;
  tasks: TaskEntry[];
};

type UserEntry = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  taskCount: number;
  projects: ProjectEntry[];
};

async function getWorkspaceTasksByUser(
  workspaceId: string,
): Promise<{ users: UserEntry[] }> {
  const rows = await db
    .select({
      taskId: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      priority: taskTable.priority,
      startDate: taskTable.startDate,
      dueDate: taskTable.dueDate,
      projectId: taskTable.projectId,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      userId: userTable.id,
      assigneeName: userTable.name,
      assigneeEmail: userTable.email,
      assigneeImage: userTable.image,
      columnColor: columnTable.color,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .innerJoin(userTable, eq(taskTable.userId, userTable.id))
    .leftJoin(
      columnTable,
      and(
        eq(columnTable.projectId, taskTable.projectId),
        eq(columnTable.slug, taskTable.status),
      ),
    )
    .where(eq(projectTable.workspaceId, workspaceId))
    .orderBy(
      asc(userTable.name),
      asc(projectTable.name),
      asc(taskTable.position),
    );

  const usersMap = new Map<string, UserEntry>();

  for (const row of rows) {
    let user = usersMap.get(row.userId);
    if (!user) {
      user = {
        id: row.userId,
        name: row.assigneeName ?? "",
        email: row.assigneeEmail,
        image: row.assigneeImage,
        taskCount: 0,
        projects: [],
      };
      usersMap.set(row.userId, user);
    }

    let project = user.projects.find((p) => p.id === row.projectId);
    if (!project) {
      project = {
        id: row.projectId,
        name: row.projectName,
        slug: row.projectSlug ?? "",
        tasks: [],
      };
      user.projects.push(project);
    }

    project.tasks.push({
      id: row.taskId,
      title: row.title,
      number: row.number,
      status: row.status,
      priority: row.priority,
      startDate: row.startDate ? row.startDate.toISOString() : null,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      projectId: row.projectId,
      columnColor: row.columnColor ?? null,
    });

    user.taskCount += 1;
  }

  return { users: Array.from(usersMap.values()) };
}

export default getWorkspaceTasksByUser;
