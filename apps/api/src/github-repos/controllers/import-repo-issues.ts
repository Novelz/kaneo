import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  labelTable,
  projectGithubRepoTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import {
  createExternalLink,
  findExternalLinkByRepo,
} from "../../plugins/github/services/link-manager";
import {
  extractIssuePriority,
  extractIssueStatus,
} from "../../plugins/github/utils/extract-priority";
import { formatTaskDescriptionFromIssue } from "../../plugins/github/utils/format";
import { getInstallationOctokit } from "../../plugins/github/utils/github-app";
import getNextTaskNumber from "../../task/controllers/get-next-task-number";

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  created_at: string;
  labels: Array<{ name?: string; color?: string } | string>;
  user: { login: string; avatar_url: string } | null;
  pull_request?: unknown;
  milestone?: { due_on: string | null } | null;
};

type ImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors?: string[];
};

export async function importRepoIssues(
  projectId: string,
  repoId: string,
): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const repo = await db.query.projectGithubRepoTable.findFirst({
    where: and(
      eq(projectGithubRepoTable.id, repoId),
      eq(projectGithubRepoTable.projectId, projectId),
    ),
  });

  if (!repo) {
    throw new HTTPException(404, { message: "Repository not found" });
  }

  if (!repo.installationId) {
    throw new HTTPException(400, {
      message:
        "Repository has no GitHub App installation. Please remove and re-add it.",
    });
  }

  const octokit = await getInstallationOctokit(Number(repo.installationId));

  const allIssues: GitHubIssue[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner: repo.repositoryOwner,
      repo: repo.repositoryName,
      state: "open",
      per_page: perPage,
      page,
    });

    if (issues.length === 0) break;

    const issuesOnly = issues.filter(
      (issue) => !issue.pull_request,
    ) as GitHubIssue[];
    allIssues.push(...issuesOnly);

    if (issues.length < perPage) break;
    page++;
  }

  for (const issue of allIssues) {
    try {
      const result = await importSingleIssue(
        issue,
        repo.id,
        projectId,
        project.workspaceId,
      );

      if (result === "imported") {
        imported++;
      } else if (result === "updated") {
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(`Issue #${issue.number}: ${errorMessage}`);
    }
  }

  return {
    imported,
    updated,
    skipped,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

async function importSingleIssue(
  issue: GitHubIssue,
  repoId: string,
  projectId: string,
  workspaceId: string,
): Promise<"imported" | "updated" | "skipped"> {
  const existingLink = await findExternalLinkByRepo(
    repoId,
    "issue",
    issue.number.toString(),
  );

  const priority = extractIssuePriority(issue.labels);
  const status = extractIssueStatus(issue.labels);
  const startDate = issue.created_at ? new Date(issue.created_at) : null;
  const dueDate = issue.milestone?.due_on
    ? new Date(issue.milestone.due_on)
    : null;

  if (existingLink) {
    const updateData: Record<string, unknown> = {
      title: issue.title,
      description: formatTaskDescriptionFromIssue(issue.body),
    };

    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (dueDate) updateData.dueDate = dueDate;

    await db
      .update(taskTable)
      .set(updateData)
      .where(eq(taskTable.id, existingLink.taskId));

    await importLabelsForTask(issue.labels, existingLink.taskId, workspaceId);

    return "updated";
  }

  const nextTaskNumber = await getNextTaskNumber(projectId);

  const [createdTask] = await db
    .insert(taskTable)
    .values({
      projectId,
      userId: null,
      title: issue.title,
      description: formatTaskDescriptionFromIssue(issue.body),
      status: status || "to-do",
      priority: priority || null,
      number: nextTaskNumber + 1,
      startDate,
      dueDate,
    })
    .returning();

  if (!createdTask) {
    throw new Error("Failed to create task");
  }

  await createExternalLink({
    taskId: createdTask.id,
    githubRepoId: repoId,
    resourceType: "issue",
    externalId: issue.number.toString(),
    url: issue.html_url,
    title: issue.title,
    metadata: {
      state: issue.state,
      createdFrom: "github-repo-import",
      author: issue.user?.login,
    },
  });

  await importLabelsForTask(issue.labels, createdTask.id, workspaceId);

  return "imported";
}

async function importLabelsForTask(
  issueLabels: GitHubIssue["labels"],
  taskId: string,
  workspaceId: string,
): Promise<void> {
  const nonSystemLabels = issueLabels
    .map((label) => {
      if (typeof label === "string") {
        return { name: label, color: "#6B7280" };
      }
      return {
        name: label.name,
        color: label.color ? `#${label.color}` : "#6B7280",
      };
    })
    .filter(
      (label) =>
        label.name &&
        !label.name.startsWith("priority:") &&
        !label.name.startsWith("status:"),
    ) as Array<{ name: string; color: string }>;

  for (const labelData of nonSystemLabels) {
    const existingLabelOnTask = await db.query.labelTable.findFirst({
      where: and(
        eq(labelTable.taskId, taskId),
        eq(labelTable.name, labelData.name),
      ),
    });

    if (existingLabelOnTask) {
      continue;
    }

    const existingWorkspaceLabel = await db.query.labelTable.findFirst({
      where: and(
        eq(labelTable.workspaceId, workspaceId),
        eq(labelTable.name, labelData.name),
      ),
    });

    const colorToUse = existingWorkspaceLabel?.color || labelData.color;

    await db
      .insert(labelTable)
      .values({
        name: labelData.name,
        color: colorToUse,
        taskId,
        workspaceId,
      })
      .onConflictDoNothing({
        target: [labelTable.taskId, labelTable.name],
      });
  }
}
