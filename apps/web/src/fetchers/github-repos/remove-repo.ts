import { client } from "@kaneo/libs";

async function removeRepo(projectId: string, repoId: string) {
  const response = await client["github-repos"].project[":projectId"][
    ":repoId"
  ].$delete({
    param: { projectId, repoId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default removeRepo;
