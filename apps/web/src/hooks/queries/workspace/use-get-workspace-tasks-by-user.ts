import { useQuery } from "@tanstack/react-query";
import getWorkspaceTasksByUser from "@/fetchers/workspace/get-workspace-tasks-by-user";

export function useGetWorkspaceTasksByUser(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-tasks-by-user", workspaceId],
    queryFn: () => getWorkspaceTasksByUser(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}
