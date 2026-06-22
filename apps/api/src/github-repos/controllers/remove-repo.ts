import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectGithubRepoTable } from "../../database/schema";

async function removeRepo({
  projectId,
  repoId,
}: {
  projectId: string;
  repoId: string;
}) {
  const [deleted] = await db
    .delete(projectGithubRepoTable)
    .where(
      and(
        eq(projectGithubRepoTable.id, repoId),
        eq(projectGithubRepoTable.projectId, projectId),
      ),
    )
    .returning({ id: projectGithubRepoTable.id });

  if (!deleted) {
    throw new HTTPException(404, { message: "Repository not found" });
  }

  return { id: deleted.id };
}

export default removeRepo;
