import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";

async function reorderProjects(
  workspaceId: string,
  projects: Array<{ id: string; position: number }>,
) {
  for (const project of projects) {
    const [updated] = await db
      .update(projectTable)
      .set({ position: project.position })
      .where(
        and(
          eq(projectTable.id, project.id),
          eq(projectTable.workspaceId, workspaceId),
        ),
      )
      .returning({ id: projectTable.id });

    if (!updated) {
      throw new HTTPException(400, {
        message: `Project ${project.id} does not belong to this workspace`,
      });
    }
  }

  const updated = await db.query.projectTable.findMany({
    where: eq(projectTable.workspaceId, workspaceId),
    orderBy: (projects, { asc }) => [asc(projects.position)],
  });

  return updated;
}

export default reorderProjects;
