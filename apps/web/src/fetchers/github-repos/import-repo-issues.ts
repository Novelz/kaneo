import { client } from "@kaneo/libs";

async function importRepoIssues(projectId: string, repoId: string) {
  const response = await client["github-repos"].project[":projectId"][
    ":repoId"
  ].import.$post({
    param: { projectId, repoId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default importRepoIssues;
