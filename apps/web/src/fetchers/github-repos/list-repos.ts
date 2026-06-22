import { client } from "@kaneo/libs";

async function listRepos(projectId: string) {
  const response = await client["github-repos"].project[":projectId"].$get({
    param: { projectId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default listRepos;
