import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

type ForgetPasswordRequest = {
  email: string;
  redirectTo: string;
};

function useForgetPassword() {
  return useMutation({
    mutationFn: async ({ email, redirectTo }: ForgetPasswordRequest) => {
      const { data, error } = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });

      if (error) {
        throw new Error(error.message || "Failed to send reset link");
      }

      return data;
    },
  });
}

export default useForgetPassword;
