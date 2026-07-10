import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createGhostUserCtrl from "./controllers/create-ghost-user";
import getWorkspaceMembersCtrl from "./controllers/get-workspace-members";
import getWorkspaceTasksByUserCtrl from "./controllers/get-workspace-tasks-by-user";

const workspace = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/:workspaceId/members",
    describeRoute({
      operationId: "getWorkspaceMembers",
      tags: ["Workspaces"],
      description: "Get all members of a workspace",
      responses: {
        200: {
          description: "List of workspace members",
          content: {
            "application/json": {
              schema: resolver(
                v.array(
                  v.object({
                    id: v.string(),
                    name: v.string(),
                    email: v.string(),
                    image: v.nullable(v.string()),
                    role: v.string(),
                  }),
                ),
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const members = await getWorkspaceMembersCtrl(workspaceId);
      return c.json(members);
    },
  )
  .get(
    "/:workspaceId/tasks-by-user",
    describeRoute({
      operationId: "getWorkspaceTasksByUser",
      tags: ["Workspaces"],
      description: "Get all assigned tasks in a workspace grouped by user",
      responses: {
        200: {
          description: "Tasks grouped by user",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  users: v.array(
                    v.object({
                      id: v.string(),
                      name: v.string(),
                      email: v.string(),
                      image: v.nullable(v.string()),
                      taskCount: v.number(),
                      projects: v.array(
                        v.object({
                          id: v.string(),
                          name: v.string(),
                          slug: v.string(),
                          tasks: v.array(
                            v.object({
                              id: v.string(),
                              title: v.string(),
                              number: v.nullable(v.number()),
                              status: v.string(),
                              priority: v.string(),
                              startDate: v.nullable(v.string()),
                              dueDate: v.nullable(v.string()),
                              projectId: v.string(),
                              isFinal: v.boolean(),
                            }),
                          ),
                        }),
                      ),
                    }),
                  ),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const data = await getWorkspaceTasksByUserCtrl(workspaceId);
      return c.json(data);
    },
  )
  .post(
    "/:workspaceId/ghost-users",
    describeRoute({
      operationId: "createGhostUser",
      tags: ["Workspaces"],
      description:
        "Create a user and add them directly to the workspace without an invitation",
      responses: {
        201: {
          description: "Ghost user created",
          content: {
            "application/json": {
              schema: resolver(
                v.object({
                  userId: v.string(),
                  email: v.string(),
                  name: v.string(),
                  isNew: v.boolean(),
                }),
              ),
            },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    validator(
      "json",
      v.object({
        email: v.pipe(v.string(), v.email()),
        name: v.pipe(v.string(), v.minLength(1)),
        password: v.pipe(v.string(), v.minLength(8)),
        role: v.picklist(["viewer", "member", "admin"]),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    requireWorkspacePermission({ workspace: ["manage_settings"] }),
    async (c) => {
      const workspaceId = c.get("workspaceId");
      const { email, name, password, role } = c.req.valid("json");
      const result = await createGhostUserCtrl(
        workspaceId,
        email,
        name,
        password,
        role,
      );
      return c.json(result, 201);
    },
  );

export default workspace;
