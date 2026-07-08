import { useMutation, useQueryClient } from "@tanstack/react-query";
import reorderProjects from "@/fetchers/project/reorder-projects";

export function useReorderProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      projects,
    }: {
      workspaceId: string;
      projects: Array<{ id: string; position: number }>;
    }) => reorderProjects(workspaceId, projects),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
