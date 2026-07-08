import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useForgetPassword from "@/hooks/mutations/use-send-password-reset";
import { toast } from "@/lib/toast";
import { AuthLayout } from "../../components/auth/layout";

const forgotPasswordSchema = z.object({
  email: z.email(),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: forgetPassword } = useForgetPassword();

  const form = useForm<ForgotPasswordValues>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    try {
      const redirectTo = `${import.meta.env.VITE_CLIENT_URL || window.location.origin}/auth/reset-password`;
      await forgetPassword({ email: data.email, redirectTo });
      navigate({ to: "/auth/check-email", search: { email: data.email } });
    } catch {
      toast.error(t("auth:forgotPassword.toast.failed"));
    }
  };

  return (
    <>
      <PageTitle title={t("auth:forgotPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:forgotPassword.title")}
        subtitle={t("auth:forgotPassword.subtitle")}
      >
        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("auth:forms.email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("auth:forms.emailPlaceholder")}
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                size="sm"
                className="w-full mt-4"
              >
                {form.formState.isSubmitting
                  ? t("auth:forgotPassword.submitting")
                  : t("auth:forgotPassword.submit")}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground mt-3">
            <Link
              to="/auth/sign-in"
              className="underline underline-offset-4 hover:text-primary"
            >
              {t("auth:forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
