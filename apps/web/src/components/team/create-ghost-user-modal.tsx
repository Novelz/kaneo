import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod/v4";
import useCreateGhostUser from "@/hooks/mutations/workspace-user/use-create-ghost-user";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ghostUserSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["viewer", "member", "admin"]),
});

type GhostUserFormValues = z.infer<typeof ghostUserSchema>;

function CreateGhostUserModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { mutateAsync } = useCreateGhostUser();
  const { data: workspace } = useActiveWorkspace();
  const workspaceId = workspace?.id;
  const { canInviteUsers } = useWorkspacePermission();
  const canInvite = canInviteUsers();

  const form = useForm<GhostUserFormValues>({
    resolver: standardSchemaResolver(ghostUserSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      role: "member",
    },
  });

  const onSubmit = async ({
    email,
    name,
    password,
    role,
  }: GhostUserFormValues) => {
    if (!workspaceId) {
      toast.error(t("team:ghostUserModal.error"));
      return;
    }
    if (!canInvite) {
      toast.error(t("team:ghostUserModal.error"));
      return;
    }
    try {
      const result = await mutateAsync({
        workspaceId,
        email,
        name,
        password,
        role,
      });
      toast.success(
        result.isNew
          ? t("team:ghostUserModal.success")
          : t("team:ghostUserModal.successExisting"),
      );
      form.reset();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("team:ghostUserModal.error"),
      );
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{t("team:ghostUserModal.title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <DialogPanel className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team:ghostUserModal.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={t("team:ghostUserModal.emailPlaceholder")}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team:ghostUserModal.nameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("team:ghostUserModal.namePlaceholder")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("team:ghostUserModal.passwordLabel")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={t(
                          "team:ghostUserModal.passwordPlaceholder",
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("team:ghostUserModal.roleLabel")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">
                            {t("team:roles.viewer")}
                          </SelectItem>
                          <SelectItem value="member">
                            {t("team:roles.member")}
                          </SelectItem>
                          <SelectItem value="admin">
                            {t("team:roles.admin")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogPanel>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" size="sm" type="button" />}
              >
                {t("common:actions.cancel")}
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={!workspaceId || !canInvite}
              >
                {t("team:ghostUserModal.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}

export default CreateGhostUserModal;
