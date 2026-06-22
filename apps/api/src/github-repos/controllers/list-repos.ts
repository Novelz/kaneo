import { eq } from "drizzle-orm";
import db from "../../database";
import { projectGithubRepoTable } from "../../database/schema";

async function listRepos(projectId: string) {
  return db.query.projectGithubRepoTable.findMany({
    where: eq(projectGithubRepoTable.projectId, projectId),
    columns: {
      id: true,
      projectId: true,
      repositoryOwner: true,
      repositoryName: true,
      createdAt: true,
    },
  });
}

export default listRepos;
