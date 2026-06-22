import { Github, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import useAddGithubRepo from "@/hooks/mutations/github-repos/use-add-github-repo";
import useImportRepoIssues from "@/hooks/mutations/github-repos/use-import-repo-issues";
import useRemoveGithubRepo from "@/hooks/mutations/github-repos/use-remove-github-repo";
import useGithubRepos from "@/hooks/queries/github-repos/use-github-repos";
import { toast } from "@/lib/toast";

type Props = {
  projectId: string;
  children: React.ReactNode;
};

export function GithubImportDialog({ projectId, children }: Props) {
  const [repoInput, setRepoInput] = React.useState("");
  const [importingRepoId, setImportingRepoId] = React.useState<string | null>(
    null,
  );

  const { data: repos = [], isLoading } = useGithubRepos(projectId);
  const { mutateAsync: addRepo, isPending: isAdding } = useAddGithubRepo();
  const { mutateAsync: removeRepo, isPending: isRemoving } =
    useRemoveGithubRepo();
  const { mutateAsync: importIssues } = useImportRepoIssues();

  const handleAddRepo = async () => {
    const trimmed = repoInput.trim();
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      toast.error("Formato non valido. Usa il formato: owner/repository");
      return;
    }

    const [repositoryOwner, repositoryName] = parts;

    try {
      await addRepo({ projectId, repositoryOwner, repositoryName });
      setRepoInput("");
      toast.success(`Repository ${trimmed} aggiunta con successo`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'aggiunta della repository",
      );
    }
  };

  const handleRemoveRepo = async (repoId: string, repoName: string) => {
    try {
      await removeRepo({ projectId, repoId });
      toast.success(`Repository ${repoName} rimossa`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante la rimozione della repository",
      );
    }
  };

  const handleImport = async (repoId: string, repoName: string) => {
    setImportingRepoId(repoId);
    try {
      const result = await importIssues({ projectId, repoId });
      const { imported, updated, skipped } = result as {
        imported: number;
        updated: number;
        skipped: number;
      };
      toast.success(
        `${repoName}: ${imported} importate, ${updated} aggiornate, ${skipped} saltate`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Errore durante l'import da ${repoName}`,
      );
    } finally {
      setImportingRepoId(null);
    }
  };

  const handleImportAll = async () => {
    for (const repo of repos) {
      await handleImport(
        repo.id,
        `${repo.repositoryOwner}/${repo.repositoryName}`,
      );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <DialogTitle>Import Issues da GitHub</DialogTitle>
          </div>
          <DialogDescription>
            Collega repository GitHub al progetto e importa le issue aperte come
            task.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : repos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nessuna repository collegata. Aggiungine una qui sotto.
            </p>
          ) : (
            <div className="space-y-2">
              {repos.map((repo) => {
                const repoName = `${repo.repositoryOwner}/${repo.repositoryName}`;
                const isImporting = importingRepoId === repo.id;
                return (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-sidebar p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {repoName}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleImport(repo.id, repoName)}
                        disabled={isImporting || importingRepoId !== null}
                      >
                        {isImporting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        {isImporting ? "Importing..." : "Import"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive-foreground"
                        onClick={() => handleRemoveRepo(repo.id, repoName)}
                        disabled={isRemoving || importingRepoId === repo.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-2">
            <p className="text-sm font-medium">Aggiungi repository</p>
            <p className="text-xs text-muted-foreground">
              Il GitHub App deve essere installato sulla repository. Usa il
              formato: <span className="font-mono">owner/repository</span>
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="es. facebook/react"
                value={repoInput}
                onChange={(e) =>
                  setRepoInput((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRepo();
                }}
                disabled={isAdding}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRepo}
                disabled={isAdding || !repoInput.trim()}
                className="gap-1.5 shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Aggiungi
              </Button>
            </div>
          </div>
        </DialogPanel>

        <DialogFooter>
          {repos.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportAll}
              disabled={importingRepoId !== null}
              className="gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Importa tutte
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Chiudi
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
