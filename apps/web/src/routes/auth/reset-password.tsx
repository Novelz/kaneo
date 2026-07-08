import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import PageTitle from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import useResetPassword from "@/hooks/mutations/use-reset-password";
import { toast } from "@/lib/toast";
import { AuthLayout } from "../../components/auth/layout";

const resetPasswordSearchSchema = (search: Record<string, unknown>) => ({
  token: (search.token as string | undefined) ?? "",
});

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPassword,
  validateSearch: resetPasswordSearchSchema,
});

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const { mutateAsync: resetPassword } = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetPasswordSchema = z
    .object({
      newPassword: z
        .string()
        .min(8, t("auth:resetPassword.validation.passwordTooShort")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("auth:resetPassword.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

  type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

  const form = useForm<ResetPasswordValues>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordValues) => {
    try {
      await resetPassword({ newPassword: data.newPassword, token });
      toast.success(t("auth:resetPassword.toast.success"));
      navigate({ to: "/auth/sign-in" });
    } catch {
      toast.error(t("auth:resetPassword.toast.failed"));
    }
  };

  if (!token) {
    return (
      <>
        <PageTitle title={t("auth:resetPassword.pageTitle")} />
        <AuthLayout title={t("auth:resetPassword.title")}>
          <div className="mt-4 space-y-4">
            <Alert variant="error">
              <AlertDescription>
                {t("auth:resetPassword.invalidToken")}
              </AlertDescription>
            </Alert>
            <Button
              variant="ghost"
              asChild
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link to="/auth/sign-in">
                {t("auth:resetPassword.backToLogin")}
              </Link>
            </Button>
          </div>
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("auth:resetPassword.pageTitle")} />
      <AuthLayout
        title={t("auth:resetPassword.title")}
        subtitle={t("auth:resetPassword.subtitle")}
      >
        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("auth:resetPassword.newPassword")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t("auth:forms.passwordPlaceholder")}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showPassword
                              ? t("auth:forms.hidePassword")
                              : t("auth:forms.showPassword")
                          }
                          aria-pressed={showPassword}
                        >
                          {showPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t("auth:resetPassword.confirmPassword")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t("auth:forms.passwordPlaceholder")}
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={
                            showConfirm
                              ? t("auth:forms.hidePassword")
                              : t("auth:forms.showPassword")
                          }
                          aria-pressed={showConfirm}
                        >
                          {showConfirm ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
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
                  ? t("auth:resetPassword.submitting")
                  : t("auth:resetPassword.submit")}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground mt-3">
            <Link
              to="/auth/sign-in"
              className="underline underline-offset-4 hover:text-primary"
            >
              {t("auth:resetPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
