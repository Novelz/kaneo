import { client } from "@kaneo/libs";

export type CreateGhostUserRequest = {
  workspaceId: string;
  email: string;
  name: string;
  password: string;
  role: "viewer" | "member" | "admin";
};

const createGhostUser = async ({
  workspaceId,
  ...body
}: CreateGhostUserRequest) => {
  const response = await client.workspace[":workspaceId"]["ghost-users"].$post({
    param: { workspaceId },
    json: body,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(
      (err as { message?: string })?.message || "Failed to create user",
    );
  }

  return response.json();
};

export default createGhostUser;
