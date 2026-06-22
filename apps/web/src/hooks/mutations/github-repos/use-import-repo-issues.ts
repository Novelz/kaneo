import { useMutation } from "@tanstack/react-query";
import importRepoIssues from "@/fetchers/github-repos/import-repo-issues";
import queryClient from "@/query-client";

function useImportRepoIssues() {
  return useMutation({
    mutationFn: ({
      projectId,
      repoId,
    }: {
      projectId: string;
      repoId: string;
    }) => importRepoIssues(projectId, repoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
    },
  });
}

export default useImportRepoIssues;
