"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/context/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, diffInDays, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import type { Task, CustomFieldDefinition } from "@/lib/models";

type SortKey = "name" | "assignee" | "section" | "status" | "dueOn" | "age" | "modifiedAt";
type ColumnKey = SortKey | "tags" | "asana";

const BASE_COLUMNS: { key: ColumnKey; labelKey: string; defaultVisible: boolean }[] = [
  { key: "name", labelKey: "table.colTask", defaultVisible: true },
  { key: "assignee", labelKey: "table.colAssignee", defaultVisible: true },
  { key: "section", labelKey: "table.colSection", defaultVisible: true },
  { key: "status", labelKey: "table.colStatus", defaultVisible: true },
  { key: "dueOn", labelKey: "table.colDueDate", defaultVisible: true },
  { key: "age", labelKey: "table.colAge", defaultVisible: true },
  { key: "modifiedAt", labelKey: "table.colLastModified", defaultVisible: false },
  { key: "tags", labelKey: "table.colTags", defaultVisible: false },
  { key: "asana", labelKey: "table.colAsana", defaultVisible: true },
];

const PAGE_SIZE = 25;

export function TaskTable({
  tasks,
  customFieldDefinitions,
  referenceDate,
  onExportCsv,
}: {
  tasks: Task[];
  customFieldDefinitions: CustomFieldDefinition[];
  referenceDate: string;
  onExportCsv: () => void;
}) {
  const { locale, t } = useLocale();
  const [sortKey, setSortKey] = useState<SortKey>("dueOn");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(BASE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [visibleCustomFields, setVisibleCustomFields] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPage(1), [tasks]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setColumnMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const sorted = useMemo(() => {
    const copy = [...tasks];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "assignee":
          return (a.assigneeName ?? "").localeCompare(b.assigneeName ?? "") * dir;
        case "section":
          return (a.sectionName ?? "").localeCompare(b.sectionName ?? "") * dir;
        case "status":
          return (Number(a.completed) - Number(b.completed)) * dir;
        case "dueOn":
          return ((a.dueOn ?? "9999") > (b.dueOn ?? "9999") ? 1 : -1) * dir;
        case "age":
          return (diffInDays(a.createdAt.slice(0, 10), referenceDate) - diffInDays(b.createdAt.slice(0, 10), referenceDate)) * dir;
        case "modifiedAt":
          return (a.modifiedAt > b.modifiedAt ? 1 : -1) * dir;
        default:
          return 0;
      }
    });
    return copy;
  }, [tasks, sortKey, sortDir, referenceDate]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleCustomField(id: string) {
    setVisibleCustomFields((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? <span className="ms-1 text-primary">{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("table.title")}</CardTitle>
          <CardSubtitle>{t("table.showingCount", { shown: pageRows.length, total: sorted.length })}</CardSubtitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={menuRef}>
            <Button size="sm" variant="outline" onClick={() => setColumnMenuOpen((v) => !v)}>
              {t("table.columns")}
            </Button>
            {columnMenuOpen && (
              <div className="absolute end-0 z-40 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-border bg-surface-raised p-1 shadow-raised animate-slide-up">
                {BASE_COLUMNS.filter((c) => c.key !== "name").map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="h-3.5 w-3.5 accent-[var(--primary)]"
                    />
                    {t(c.labelKey)}
                  </label>
                ))}
                {customFieldDefinitions.length > 0 && (
                  <>
                    <div className="my-1 border-t border-border" />
                    {customFieldDefinitions.map((f) => (
                      <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={visibleCustomFields.has(f.id)}
                          onChange={() => toggleCustomField(f.id)}
                          className="h-3.5 w-3.5 accent-[var(--primary)]"
                        />
                        {f.name}
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={onExportCsv}>
            {t("table.exportCsv")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("table.noResults")}</p>
        ) : (
          <>
            <div className="max-h-[560px] overflow-y-auto">
              <Table>
                <THead>
                  <TR>
                    <TH className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      {t("table.colTask")}
                      {sortIndicator("name")}
                    </TH>
                    {visibleColumns.has("assignee") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("assignee")}>
                        {t("table.colAssignee")}
                        {sortIndicator("assignee")}
                      </TH>
                    )}
                    {visibleColumns.has("section") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("section")}>
                        {t("table.colSection")}
                        {sortIndicator("section")}
                      </TH>
                    )}
                    {visibleColumns.has("status") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                        {t("table.colStatus")}
                        {sortIndicator("status")}
                      </TH>
                    )}
                    {visibleColumns.has("dueOn") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("dueOn")}>
                        {t("table.colDueDate")}
                        {sortIndicator("dueOn")}
                      </TH>
                    )}
                    {visibleColumns.has("age") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("age")}>
                        {t("table.colAge")}
                        {sortIndicator("age")}
                      </TH>
                    )}
                    {visibleColumns.has("modifiedAt") && (
                      <TH className="cursor-pointer select-none" onClick={() => toggleSort("modifiedAt")}>
                        {t("table.colLastModified")}
                        {sortIndicator("modifiedAt")}
                      </TH>
                    )}
                    {visibleColumns.has("tags") && <TH>{t("table.colTags")}</TH>}
                    {[...visibleCustomFields].map((id) => (
                      <TH key={id}>{customFieldDefinitions.find((f) => f.id === id)?.name}</TH>
                    ))}
                    {visibleColumns.has("asana") && <TH>{t("table.colAsana")}</TH>}
                  </TR>
                </THead>
                <TBody>
                  {pageRows.map((task) => (
                    <TR key={task.id}>
                      <TD className="max-w-[280px] truncate font-medium text-foreground" title={task.name}>
                        {task.name}
                        {task.numSubtasks > 0 && (
                          <span className="ms-1.5 text-xs text-muted-foreground">({task.numSubtasks})</span>
                        )}
                      </TD>
                      {visibleColumns.has("assignee") && (
                        <TD className="text-muted-foreground">{task.assigneeName ?? t("common.unassigned")}</TD>
                      )}
                      {visibleColumns.has("section") && (
                        <TD className="text-muted-foreground">{task.sectionName ?? t("common.noSection")}</TD>
                      )}
                      {visibleColumns.has("status") && (
                        <TD>
                          <Badge tone={task.completed ? "success" : "info"}>
                            {task.completed ? t("table.statusCompleted") : t("table.statusOpen")}
                          </Badge>
                        </TD>
                      )}
                      {visibleColumns.has("dueOn") && <TD>{formatDate(task.dueOn, locale)}</TD>}
                      {visibleColumns.has("age") && (
                        <TD className="tabular-nums">
                          {formatNumber(Math.max(0, diffInDays(task.createdAt.slice(0, 10), referenceDate)), locale)}{" "}
                          {t("common.days")}
                        </TD>
                      )}
                      {visibleColumns.has("modifiedAt") && <TD>{formatDateTime(task.modifiedAt, locale)}</TD>}
                      {visibleColumns.has("tags") && (
                        <TD>
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag) => (
                              <Badge key={tag.id}>{tag.name}</Badge>
                            ))}
                          </div>
                        </TD>
                      )}
                      {[...visibleCustomFields].map((id) => {
                        const field = task.customFields.find((f) => f.id === id);
                        return (
                          <TD key={id} className="text-muted-foreground">
                            {field?.displayValue ?? (Array.isArray(field?.value) ? field?.value.join(", ") : field?.value?.toString()) ?? "—"}
                          </TD>
                        );
                      })}
                      {visibleColumns.has("asana") && (
                        <TD>
                          <a href={task.permalinkUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {t("common.openInAsana")}
                          </a>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("table.page", { current: page, total: totalPages })}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {t("table.previous")}
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  {t("table.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
