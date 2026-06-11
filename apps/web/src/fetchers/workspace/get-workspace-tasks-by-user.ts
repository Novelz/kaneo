import { client } from "@kaneo/libs";

async function getWorkspaceTasksByUser(workspaceId: string) {
  const response = await client.workspace[":workspaceId"]["tasks-by-user"].$get(
    {
      param: { workspaceId },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const json = await response.json();

  return json;
}

export default getWorkspaceTasksByUser;
