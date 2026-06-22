import { useQuery } from "@tanstack/react-query";
import listRepos from "@/fetchers/github-repos/list-repos";

function useGithubRepos(projectId: string) {
  return useQuery({
    queryKey: ["github-repos", projectId],
    queryFn: () => listRepos(projectId),
    enabled: !!projectId,
  });
}

export default useGithubRepos;
