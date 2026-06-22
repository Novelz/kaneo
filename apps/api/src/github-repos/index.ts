import { Hono } from "hono";
import { describeRoute, validator } from "hono-openapi";
import * as v from "valibot";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import addRepo from "./controllers/add-repo";
import { importRepoIssues } from "./controllers/import-repo-issues";
import listRepos from "./controllers/list-repos";
import removeRepo from "./controllers/remove-repo";

const githubRepos = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
    apiKey?: {
      id: string;
      userId: string;
      enabled: boolean;
    };
  };
}>()
  .get(
    "/project/:projectId",
    describeRoute({
      operationId: "listGithubRepos",
      tags: ["GitHub Repos"],
      description: "List GitHub repositories linked to a project",
      responses: {
        200: { description: "List of linked repositories" },
      },
    }),
    validator("param", v.object({ projectId: v.string() })),
    workspaceAccess.fromProject("projectId"),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const repos = await listRepos(projectId);
      return c.json(repos);
    },
  )
  .post(
    "/project/:projectId",
    describeRoute({
      operationId: "addGithubRepo",
      tags: ["GitHub Repos"],
      description: "Link a GitHub repository to a project",
      responses: {
        200: { description: "Repository linked successfully" },
      },
    }),
    validator("param", v.object({ projectId: v.string() })),
    validator(
      "json",
      v.object({
        repositoryOwner: v.pipe(v.string(), v.minLength(1)),
        repositoryName: v.pipe(v.string(), v.minLength(1)),
      }),
    ),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ task: ["create"] }),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { repositoryOwner, repositoryName } = c.req.valid("json");
      const repo = await addRepo({
        projectId,
        repositoryOwner,
        repositoryName,
      });
      return c.json(repo);
    },
  )
  .delete(
    "/project/:projectId/:repoId",
    describeRoute({
      operationId: "removeGithubRepo",
      tags: ["GitHub Repos"],
      description: "Remove a GitHub repository from a project",
      responses: {
        200: { description: "Repository removed successfully" },
      },
    }),
    validator("param", v.object({ projectId: v.string(), repoId: v.string() })),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ task: ["create"] }),
    async (c) => {
      const { projectId, repoId } = c.req.valid("param");
      const result = await removeRepo({ projectId, repoId });
      return c.json(result);
    },
  )
  .post(
    "/project/:projectId/:repoId/import",
    describeRoute({
      operationId: "importGithubRepoIssues",
      tags: ["GitHub Repos"],
      description: "Import open issues from a GitHub repository as tasks",
      responses: {
        200: { description: "Import result" },
      },
    }),
    validator("param", v.object({ projectId: v.string(), repoId: v.string() })),
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ task: ["create"] }),
    async (c) => {
      const { projectId, repoId } = c.req.valid("param");
      const result = await importRepoIssues(projectId, repoId);
      return c.json(result);
    },
  );

export default githubRepos;
