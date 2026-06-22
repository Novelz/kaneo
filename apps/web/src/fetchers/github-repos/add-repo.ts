import { client } from "@kaneo/libs";

async function addRepo(
  projectId: string,
  data: { repositoryOwner: string; repositoryName: string },
) {
  const response = await client["github-repos"].project[":projectId"].$post({
    param: { projectId },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default addRepo;
