import { useMutation } from "@tanstack/react-query";
import createGhostUser, {
  type CreateGhostUserRequest,
} from "@/fetchers/workspace-user/create-ghost-user";
import queryClient from "@/query-client";

function useCreateGhostUser() {
  return useMutation({
    mutationFn: (req: CreateGhostUserRequest) => createGhostUser(req),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-users", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workspace", "full", workspaceId],
      });
    },
  });
}

export default useCreateGhostUser;
