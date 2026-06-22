import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectGithubRepoTable } from "../../database/schema";
import verifyGithubInstallation from "../../github-integration/controllers/verify-github-installation";

async function addRepo({
  projectId,
  repositoryOwner,
  repositoryName,
}: {
  projectId: string;
  repositoryOwner: string;
  repositoryName: string;
}) {
  const verification = await verifyGithubInstallation({
    repositoryOwner,
    repositoryName,
  });

  if (!verification.isInstalled) {
    throw new HTTPException(400, {
      message: verification.repositoryExists
        ? "GitHub App is not installed on this repository. Please install it first."
        : "Repository not found or not accessible.",
    });
  }

  if (!verification.hasRequiredPermissions) {
    throw new HTTPException(400, {
      message: `GitHub App is missing required permissions: ${(verification.missingPermissions ?? []).join(", ")}`,
    });
  }

  const installationId = verification.installationId
    ? String(verification.installationId)
    : null;

  const [repo] = await db
    .insert(projectGithubRepoTable)
    .values({
      projectId,
      repositoryOwner,
      repositoryName,
      installationId,
    })
    .onConflictDoUpdate({
      target: [
        projectGithubRepoTable.projectId,
        projectGithubRepoTable.repositoryOwner,
        projectGithubRepoTable.repositoryName,
      ],
      set: { installationId },
    })
    .returning();

  if (!repo) {
    throw new HTTPException(500, { message: "Failed to add repository" });
  }

  return repo;
}

export default addRepo;
