import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  GanttChartSquare,
  LayoutList,
} from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import { GanttTaskBar } from "@/components/gantt/gantt-task-bar";
import PageTitle from "@/components/page-title";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { useGetWorkspaceTasksByUser } from "@/hooks/queries/workspace/use-get-workspace-tasks-by-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/cn";
import { resolveColumnColor } from "@/lib/column";
import { getPriorityLabel, getStatusLabel } from "@/lib/i18n/domain";
import { useUserPreferencesStore } from "@/store/user-preferences";
import type Task from "@/types/task";

type UsersSearchParams = {
  taskId?: string;
  taskProjectId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/users",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): UsersSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    taskProjectId:
      typeof search.taskProjectId === "string"
        ? search.taskProjectId
        : undefined,
  }),
});

function parseTaskDate(value: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = Route.useParams();
  const { taskId, taskProjectId } = Route.useSearch();
  const navigate = useNavigate();
  const { data } = useGetWorkspaceTasksByUser(workspaceId);
  const weekStartsOn = useUserPreferencesStore((state) => state.weekStartsOn);
  const isMobile = useIsMobile();
  const [view, setView] = useState<"list" | "gantt">("list");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(),
  );
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const ganttStickyColumnRef = useRef<HTMLDivElement>(null);
  const [pixelsPerDay, setPixelsPerDay] = useState(44);

  const dayColumnWidthRem = isMobile ? 3.125 : 2.75;
  const taskColumnWidthRem = isMobile ? 12 : 14;

  const users = data?.users ?? [];

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function openTask(taskId: string, projectId: string) {
    navigate({
      to: ".",
      search: { taskId, taskProjectId: projectId },
      replace: true,
    });
  }

  function closeTask() {
    navigate({ to: ".", search: {}, replace: true });
  }

  const allStatuses = useMemo(() => {
    const seen = new Set<string>();
    for (const user of users) {
      for (const project of user.projects) {
        for (const task of project.tasks) {
          seen.add(task.status);
        }
      }
    }
    return [...seen].sort();
  }, [users]);

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  // Flat list of all scheduled tasks for the gantt timeline
  type UserTask = {
    task: Task & { scheduleStart: Date; scheduleEnd: Date };
    userId: string;
    userName: string;
  };

  const ganttRows = useMemo<UserTask[]>(() => {
    return users.flatMap((user) =>
      user.projects.flatMap((project) =>
        project.tasks
          .filter(
            (task) =>
              task.isFinal === showDoneTasks &&
              (selectedStatuses.size === 0 ||
                selectedStatuses.has(task.status)),
          )
          .map((apiTask) => {
            const parsedStart =
              parseTaskDate(apiTask.startDate) ??
              parseTaskDate(apiTask.dueDate);
            const parsedEnd =
              parseTaskDate(apiTask.dueDate) ??
              parseTaskDate(apiTask.startDate);

            if (!parsedStart || !parsedEnd) return null;

            const start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
            const end = parsedEnd >= parsedStart ? parsedEnd : parsedStart;

            const task: Task & { scheduleStart: Date; scheduleEnd: Date } = {
              id: apiTask.id,
              title: apiTask.title,
              number: apiTask.number,
              description: null,
              status: apiTask.status,
              priority: apiTask.priority,
              startDate: apiTask.startDate,
              dueDate: apiTask.dueDate,
              position: null,
              createdAt: "",
              userId: user.id,
              assigneeId: user.id,
              assigneeName: user.name,
              assigneeImage: user.image,
              projectId: apiTask.projectId,
              columnId: null,
              scheduleStart: start,
              scheduleEnd: end,
            };

            return { task, userId: user.id, userName: user.name };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null),
      ),
    );
  }, [users, selectedStatuses, showDoneTasks]);

  const timeline = useMemo(() => {
    if (ganttRows.length === 0) return null;

    const [firstRow] = ganttRows;
    const earliest = ganttRows.reduce(
      (cur, row) =>
        row.task.scheduleStart < cur ? row.task.scheduleStart : cur,
      firstRow.task.scheduleStart,
    );
    const latest = ganttRows.reduce(
      (cur, row) => (row.task.scheduleEnd > cur ? row.task.scheduleEnd : cur),
      firstRow.task.scheduleEnd,
    );

    const weekStart = startOfWeek(earliest, { weekStartsOn });
    const weekEnd = endOfWeek(latest, { weekStartsOn });
    const rangeStart = subDays(weekStart, 7);
    const rangeEnd = addDays(weekEnd, 28);
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    return {
      days,
      rangeStart,
      gridTemplateColumns: `repeat(${days.length}, minmax(${dayColumnWidthRem}rem, ${dayColumnWidthRem}rem))`,
      timelineMinWidthRem: days.length * dayColumnWidthRem,
    };
  }, [ganttRows, dayColumnWidthRem, weekStartsOn]);

  useLayoutEffect(() => {
    const element = timelineTrackRef.current;
    if (!element || !timeline) return;

    const update = () => {
      const count = timeline.days.length;
      if (count <= 0) return;
      setPixelsPerDay(element.clientWidth / count);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [timeline]);

  useLayoutEffect(() => {
    if (view !== "gantt" || !timeline) return;
    const scrollElement = ganttScrollRef.current;
    const trackElement = timelineTrackRef.current;
    if (!scrollElement || !trackElement) return;

    const todayIndex = timeline.days.findIndex((day) => isToday(day));
    if (todayIndex === -1) return;

    const dayWidth = trackElement.clientWidth / timeline.days.length;
    const stickyWidth = ganttStickyColumnRef.current?.clientWidth ?? 0;
    const timelineViewportWidth = scrollElement.clientWidth - stickyWidth;
    const scrollLeft =
      todayIndex * dayWidth + dayWidth / 2 - timelineViewportWidth / 2;

    scrollElement.scrollLeft = Math.max(0, scrollLeft);
  }, [view, timeline]);

  const ganttRowsByUser = useMemo(() => {
    const map = new Map<string, UserTask[]>();
    for (const row of ganttRows) {
      let arr = map.get(row.userId);
      if (!arr) {
        arr = [];
        map.set(row.userId, arr);
      }
      arr.push(row);
    }
    return map;
  }, [ganttRows]);

  return (
    <>
      <PageTitle title={t("users:pageTitle")} />
      <WorkspaceLayout
        title={t("users:pageTitle")}
        headerActions={
          <div className="flex items-center gap-2">
            {view === "gantt" && (
              <div className="flex items-center gap-1.5">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {t("users:showDoneTasks")}
                </span>
                <Switch
                  checked={showDoneTasks}
                  onCheckedChange={setShowDoneTasks}
                  aria-label={t("users:showDoneTasks")}
                />
              </div>
            )}
            {allStatuses.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium outline-none ring-0",
                        selectedStatuses.size > 0
                          ? "border-primary/50 bg-primary/8 text-primary hover:bg-primary/12"
                          : "border-border bg-background text-foreground hover:bg-accent/60",
                      )}
                    />
                  }
                >
                  <Filter className="size-3" />
                  {t("users:filterStatus")}
                  {selectedStatuses.size > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {selectedStatuses.size}
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 p-1" align="end">
                  <button
                    type="button"
                    className={cn(
                      "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs",
                      selectedStatuses.size === 0
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/90 hover:bg-accent/60",
                    )}
                    onClick={() => setSelectedStatuses(new Set())}
                  >
                    <span
                      className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                        selectedStatuses.size === 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background",
                      )}
                    >
                      {selectedStatuses.size === 0 ? "✓" : null}
                    </span>
                    {t("users:allStatuses")}
                  </button>
                  <div className="my-1 h-px bg-border/60" />
                  {allStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={cn(
                        "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-xs",
                        selectedStatuses.has(status)
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground/90 hover:bg-accent/60",
                      )}
                      onClick={() => toggleStatus(status)}
                    >
                      <span
                        className={cn(
                          "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                          selectedStatuses.has(status)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background",
                        )}
                      >
                        {selectedStatuses.has(status) ? "✓" : null}
                      </span>
                      <span className="truncate">{getStatusLabel(status)}</span>
                    </button>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="flex items-center gap-1 rounded-md border border-border/70 p-0.5">
              <Button
                variant="ghost"
                size="xs"
                className={cn(
                  "h-6 gap-1 px-2 text-xs",
                  view === "list" && "bg-background shadow-xs",
                )}
                onClick={() => setView("list")}
              >
                <LayoutList className="size-3" />
                {t("users:listView")}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className={cn(
                  "h-6 gap-1 px-2 text-xs",
                  view === "gantt" && "bg-background shadow-xs",
                )}
                onClick={() => setView("gantt")}
              >
                <GanttChartSquare className="size-3" />
                {t("users:ganttView")}
              </Button>
            </div>
          </div>
        }
      >
        {users.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("users:noAssignedTasks")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("users:noAssignedTasksSubtitle")}
              </p>
            </div>
          </div>
        ) : view === "list" ? (
          <div className="divide-y divide-border/60">
            {users.map((user) => {
              const isOpen = expandedUsers.has(user.id);
              return (
                <div key={user.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => toggleUser(user.id)}
                  >
                    <Avatar className="size-7 shrink-0">
                      {user.image && (
                        <AvatarImage src={user.image} alt={user.name} />
                      )}
                      <AvatarFallback className="text-[10px]">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate hidden sm:block">
                        {user.email}
                      </span>
                      <span className="ml-auto shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {t("users:taskCount", { count: user.taskCount })}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/40 bg-muted/20">
                      {user.projects.map((project) => (
                        <div key={project.id}>
                          <div className="flex items-center gap-2 border-b border-border/30 px-6 py-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {project.name}
                            </span>
                            <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                              {project.slug}
                            </span>
                          </div>
                          <div className="divide-y divide-border/30">
                            {project.tasks
                              .filter(
                                (task) =>
                                  selectedStatuses.size === 0 ||
                                  selectedStatuses.has(task.status),
                              )
                              .map((task) => (
                                <button
                                  key={task.id}
                                  type="button"
                                  className="flex w-full items-center gap-3 px-8 py-2 text-left hover:bg-background transition-colors"
                                  onClick={() =>
                                    openTask(task.id, task.projectId)
                                  }
                                >
                                  <span
                                    className="shrink-0 rounded-full px-2 py-px text-[10px] font-medium uppercase tracking-wide"
                                    style={(() => {
                                      const c = resolveColumnColor(
                                        task.status,
                                        task.columnColor,
                                      );
                                      return c
                                        ? {
                                            backgroundColor: `${c}20`,
                                            color: c,
                                          }
                                        : undefined;
                                    })()}
                                  >
                                    {getStatusLabel(task.status)}
                                  </span>
                                  <span className="flex-1 truncate text-xs text-foreground">
                                    {task.title}
                                  </span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {project.slug}-{task.number}
                                  </span>
                                  {task.priority && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground hidden sm:block">
                                      {getPriorityLabel(task.priority)}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground hidden sm:block">
                                      {format(parseISO(task.dueDate), "MMM d")}
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : // Gantt view
        ganttRows.length === 0 || !timeline ? (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("users:noScheduledTasks")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("users:noScheduledTasksSubtitle")}
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={ganttScrollRef}
            className="min-h-0 flex-1 overflow-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          >
            <div className="relative min-w-max touch-pan-x touch-pan-y">
              {/* Timeline header */}
              <div className="sticky top-0 z-20 flex border-b border-border bg-background/95 backdrop-blur">
                <div
                  ref={ganttStickyColumnRef}
                  className="sticky left-0 z-30 shrink-0 border-r border-border bg-background px-2 py-2.5 sm:px-4 sm:py-3"
                  style={{
                    width: isMobile ? `${taskColumnWidthRem}rem` : "20rem",
                  }}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("users:userTaskHeader")}
                  </p>
                </div>
                <div
                  className="grid shrink-0"
                  style={{
                    gridTemplateColumns: timeline.gridTemplateColumns,
                    minWidth: `${timeline.timelineMinWidthRem}rem`,
                  }}
                >
                  {timeline.days.map((day, index) => {
                    const showMonth =
                      index === 0 ||
                      !isSameMonth(day, timeline.days[index - 1] ?? day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "border-r border-border/70 px-0.5 py-2 text-center sm:px-1",
                          isWeekend(day) && "bg-muted/25",
                        )}
                      >
                        <div className="h-4 text-[10px] font-medium text-muted-foreground">
                          {showMonth ? format(day, "MMM") : ""}
                        </div>
                        <div
                          className={cn(
                            "mx-auto flex size-6 items-center justify-center rounded-full text-xs font-medium",
                            isToday(day) &&
                              "bg-primary text-primary-foreground",
                          )}
                        >
                          {format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              <div className="relative">
                {/* Background grid lines */}
                <div
                  ref={timelineTrackRef}
                  className="absolute inset-y-0 z-0 grid"
                  style={{
                    left: isMobile ? `${taskColumnWidthRem}rem` : "20rem",
                    gridTemplateColumns: timeline.gridTemplateColumns,
                    width: `${timeline.timelineMinWidthRem}rem`,
                  }}
                >
                  {timeline.days.map((day) => (
                    <div
                      key={`bg-${day.toISOString()}`}
                      className={cn(
                        "h-full min-h-0 border-r border-border/60",
                        isWeekend(day) && "bg-muted/25",
                      )}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex flex-col">
                  {users.map((user) => {
                    const userRows = ganttRowsByUser.get(user.id) ?? [];
                    if (userRows.length === 0) return null;

                    return (
                      <div key={user.id}>
                        {/* User section header row */}
                        <div
                          className="grid border-b border-border/60 bg-muted/30"
                          style={{
                            gridTemplateColumns: isMobile
                              ? `${taskColumnWidthRem}rem max-content`
                              : "20rem max-content",
                          }}
                        >
                          <div className="sticky left-0 z-[11] flex items-center gap-2 border-r border-border bg-muted/40 px-3 py-2">
                            <Avatar className="size-5 shrink-0">
                              {user.image && (
                                <AvatarImage src={user.image} alt={user.name} />
                              )}
                              <AvatarFallback className="text-[9px]">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {user.name}
                            </span>
                            <span className="ml-auto shrink-0 rounded-full border border-border/60 px-1.5 py-px text-[10px] text-muted-foreground">
                              {user.taskCount}
                            </span>
                          </div>
                          <div
                            style={{
                              minWidth: `${timeline.timelineMinWidthRem}rem`,
                            }}
                          />
                        </div>

                        {/* Task rows for this user */}
                        {userRows.map(({ task }) => (
                          <div
                            key={task.id}
                            className="grid items-stretch border-b border-border/70"
                            style={{
                              gridTemplateColumns: isMobile
                                ? `${taskColumnWidthRem}rem max-content`
                                : "20rem max-content",
                            }}
                          >
                            <div className="sticky left-0 z-[11] h-full border-r border-border bg-background">
                              <button
                                type="button"
                                className="flex min-h-[44px] w-full min-w-0 flex-col items-start justify-center gap-0.5 px-2 py-2 text-left transition-colors hover:bg-muted sm:min-h-0 sm:px-3 sm:py-1.5"
                                onClick={() =>
                                  openTask(task.id, task.projectId)
                                }
                              >
                                <div className="flex w-full items-center gap-1.5">
                                  <span
                                    className="max-w-[7rem] truncate rounded-full px-1.5 py-px text-[10px] font-medium uppercase tracking-wide sm:max-w-none"
                                    style={(() => {
                                      const c = resolveColumnColor(
                                        task.status,
                                        task.columnColor,
                                      );
                                      return c
                                        ? {
                                            backgroundColor: `${c}20`,
                                            color: c,
                                          }
                                        : undefined;
                                    })()}
                                  >
                                    {getStatusLabel(task.status)}
                                  </span>
                                  <span className="truncate text-[10px] text-muted-foreground">
                                    {task.number}
                                  </span>
                                </div>
                                <p className="w-full line-clamp-1 text-xs font-medium leading-tight text-foreground">
                                  {task.title}
                                </p>
                                <p className="w-full truncate text-[11px] leading-tight text-muted-foreground">
                                  {format(task.scheduleStart, "MMM d")} -{" "}
                                  {format(task.scheduleEnd, "MMM d")}
                                </p>
                              </button>
                            </div>

                            <div
                              className="relative min-h-11 shrink-0 select-none"
                              style={{
                                minWidth: `${timeline.timelineMinWidthRem}rem`,
                              }}
                            >
                              <GanttTaskBar
                                task={task}
                                timeline={timeline}
                                pixelsPerDay={pixelsPerDay}
                                isMobile={isMobile}
                                onOpenTask={() =>
                                  openTask(task.id, task.projectId)
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <TaskDetailsSheet
          taskId={taskId}
          projectId={taskProjectId ?? ""}
          workspaceId={workspaceId}
          onClose={closeTask}
        />
      </WorkspaceLayout>
    </>
  );
}
