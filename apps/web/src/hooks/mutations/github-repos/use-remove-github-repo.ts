import { useMutation } from "@tanstack/react-query";
import removeRepo from "@/fetchers/github-repos/remove-repo";
import queryClient from "@/query-client";

function useRemoveGithubRepo() {
  return useMutation({
    mutationFn: ({
      projectId,
      repoId,
    }: {
      projectId: string;
      repoId: string;
    }) => removeRepo(projectId, repoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github-repos", variables.projectId],
      });
    },
  });
}

export default useRemoveGithubRepo;
