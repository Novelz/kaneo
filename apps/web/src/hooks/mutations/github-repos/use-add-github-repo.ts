import { useMutation } from "@tanstack/react-query";
import addRepo from "@/fetchers/github-repos/add-repo";
import queryClient from "@/query-client";

function useAddGithubRepo() {
  return useMutation({
    mutationFn: ({
      projectId,
      repositoryOwner,
      repositoryName,
    }: {
      projectId: string;
      repositoryOwner: string;
      repositoryName: string;
    }) => addRepo(projectId, { repositoryOwner, repositoryName }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github-repos", variables.projectId],
      });
    },
  });
}

export default useAddGithubRepo;
