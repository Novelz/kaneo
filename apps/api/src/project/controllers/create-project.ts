import db from "../../database";
import { columnTable, projectTable } from "../../database/schema";

export const DEFAULT_PROJECT_COLUMNS = [
  {
    name: "To Do",
    slug: "to-do",
    position: 0,
    isFinal: false,
    color: "#64748b",
  },
  {
    name: "In Progress",
    slug: "in-progress",
    position: 1,
    isFinal: false,
    color: "#3b82f6",
  },
  {
    name: "In Review",
    slug: "in-review",
    position: 2,
    isFinal: false,
    color: "#8b5cf6",
  },
  { name: "Done", slug: "done", position: 3, isFinal: true, color: "#22c55e" },
] as const;

async function createProject(
  workspaceId: string,
  name: string,
  icon: string,
  slug: string,
) {
  return db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projectTable)
      .values({
        workspaceId,
        name,
        icon,
        slug,
      })
      .returning();

    if (createdProject) {
      for (const col of DEFAULT_PROJECT_COLUMNS) {
        await tx.insert(columnTable).values({
          projectId: createdProject.id,
          name: col.name,
          slug: col.slug,
          position: col.position,
          isFinal: col.isFinal,
          color: col.color,
        });
      }
    }

    return createdProject;
  });
}

export default createProject;
