import type { AnalyticsResult } from "../analytics/types";
import type { Project } from "../models";
import { formatDate, formatNumber, formatPercent } from "../utils";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Renders a self-contained, printable HTML executive report (open in browser -> Print to PDF). */
export function buildExecutiveReportHtml(params: {
  project: Project;
  analytics: AnalyticsResult;
  locale: "en" | "ar";
  companyName: string;
}): string {
  const { project, analytics, locale, companyName } = params;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const reportDate = formatDate(new Date().toISOString().slice(0, 10), locale);

  const kpiRows = [
    [locale === "ar" ? "إجمالي المهام" : "Total Tasks", formatNumber(analytics.kpis.total, locale)],
    [locale === "ar" ? "مكتملة" : "Completed", formatNumber(analytics.kpis.completed, locale)],
    [locale === "ar" ? "قيد التنفيذ" : "In Progress", formatNumber(analytics.kpis.inProgress, locale)],
    [locale === "ar" ? "متأخرة" : "Overdue", formatNumber(analytics.kpis.overdue, locale)],
    [locale === "ar" ? "مستحقة اليوم" : "Due Today", formatNumber(analytics.kpis.dueToday, locale)],
    [locale === "ar" ? "بدون مسؤول" : "Unassigned", formatNumber(analytics.kpis.unassigned, locale)],
    [locale === "ar" ? "نسبة الإنجاز" : "Completion Rate", formatPercent(analytics.kpis.completionRate, locale)],
  ];

  const sectionRows = analytics.sections
    .map(
      (s) =>
        `<tr><td>${esc(s.name)}</td><td>${formatNumber(s.taskCount, locale)}</td><td>${formatPercent(s.shareOfTotal, locale)}</td><td>${formatPercent(s.completionRate, locale)}</td></tr>`
    )
    .join("");

  const workloadRows = analytics.workload
    .map(
      (w) =>
        `<tr><td>${esc(w.name)}</td><td>${formatNumber(w.total, locale)}</td><td>${formatNumber(w.completed, locale)}</td><td>${formatNumber(w.open, locale)}</td><td>${formatNumber(w.overdue, locale)}</td></tr>`
    )
    .join("");

  const overdueRows = analytics.overdueRows
    .slice(0, 50)
    .map(
      (r) =>
        `<tr><td>${esc(r.taskName)}</td><td>${esc(r.assigneeName ?? "—")}</td><td>${esc(r.sectionName ?? "—")}</td><td>${formatDate(r.dueOn, locale)}</td><td>${formatNumber(r.daysOverdue, locale)}</td></tr>`
    )
    .join("");

  const upcomingRows = analytics.upcomingRows
    .slice(0, 50)
    .map(
      (r) =>
        `<tr><td>${esc(r.taskName)}</td><td>${esc(r.assigneeName ?? "—")}</td><td>${esc(r.sectionName ?? "—")}</td><td>${formatDate(r.dueOn, locale)}</td><td>${formatNumber(r.daysRemaining, locale)}</td></tr>`
    )
    .join("");

  const taskDetailRows = analytics.tasks
    .slice(0, 500)
    .map(
      (t) =>
        `<tr><td>${esc(t.name)}</td><td>${t.completed ? (locale === "ar" ? "مكتملة" : "Completed") : locale === "ar" ? "مفتوحة" : "Open"}</td><td>${esc(t.assigneeName ?? "—")}</td><td>${esc(t.sectionName ?? "—")}</td><td>${formatDate(t.dueOn, locale)}</td></tr>`
    )
    .join("");

  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(project.name)} — ${t("Executive Report", "تقرير تنفيذي")}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1d23; margin: 40px; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  .meta { color: #6b7280; margin-bottom: 24px; font-size: 13px; }
  h2 { font-size: 15px; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  th, td { text-align: ${locale === "ar" ? "right" : "left"}; padding: 6px 8px; border-bottom: 1px solid #eef0f2; }
  th { background: #f8f9fb; font-weight: 600; }
  .summary { background: #f8f9fb; border-${locale === "ar" ? "right" : "left"}: 3px solid #4f46e5; padding: 14px 16px; font-size: 13px; line-height: 1.6; }
  @media print { body { margin: 15px; } }
</style>
</head>
<body>
  <h1>${esc(project.name)}</h1>
  <div class="meta">${t("Executive Report", "تقرير تنفيذي")} · ${t("Report Date", "تاريخ التقرير")}: ${reportDate}${companyName ? ` · ${esc(companyName)}` : ""}</div>

  <div class="summary">${esc(analytics.executiveSummary)}</div>

  <h2>${t("KPI Summary", "ملخص المؤشرات")}</h2>
  <table><tbody>${kpiRows.map(([label, value]) => `<tr><td>${label}</td><td><strong>${value}</strong></td></tr>`).join("")}</tbody></table>

  <h2>${t("Workflow Distribution", "توزيع المهام على مراحل العمل")}</h2>
  <table><thead><tr><th>${t("Section", "القسم")}</th><th>${t("Tasks", "المهام")}</th><th>${t("Share", "النسبة")}</th><th>${t("Completion", "نسبة الإنجاز")}</th></tr></thead><tbody>${sectionRows}</tbody></table>

  <h2>${t("Team Workload", "توزيع العمل على الفريق")}</h2>
  <table><thead><tr><th>${t("Member", "العضو")}</th><th>${t("Total", "الإجمالي")}</th><th>${t("Completed", "مكتملة")}</th><th>${t("Open", "مفتوحة")}</th><th>${t("Overdue", "متأخرة")}</th></tr></thead><tbody>${workloadRows}</tbody></table>

  <h2>${t("Overdue Tasks", "المهام المتأخرة")}</h2>
  <table><thead><tr><th>${t("Task", "المهمة")}</th><th>${t("Assignee", "المسؤول")}</th><th>${t("Section", "القسم")}</th><th>${t("Due Date", "تاريخ الاستحقاق")}</th><th>${t("Days Overdue", "أيام التأخير")}</th></tr></thead><tbody>${overdueRows || `<tr><td colspan="5">${t("No overdue tasks", "لا توجد مهام متأخرة")}</td></tr>`}</tbody></table>

  <h2>${t("Upcoming Work", "الأعمال القادمة")}</h2>
  <table><thead><tr><th>${t("Task", "المهمة")}</th><th>${t("Assignee", "المسؤول")}</th><th>${t("Section", "القسم")}</th><th>${t("Due Date", "تاريخ الاستحقاق")}</th><th>${t("Days Remaining", "الأيام المتبقية")}</th></tr></thead><tbody>${upcomingRows || `<tr><td colspan="5">${t("No upcoming tasks", "لا توجد أعمال قادمة")}</td></tr>`}</tbody></table>

  <h2>${t("Task Details", "تفاصيل المهام")} ${analytics.tasks.length > 500 ? t("(first 500 shown)", "(أول 500 مهمة)") : ""}</h2>
  <table><thead><tr><th>${t("Task", "المهمة")}</th><th>${t("Status", "الحالة")}</th><th>${t("Assignee", "المسؤول")}</th><th>${t("Section", "القسم")}</th><th>${t("Due Date", "تاريخ الاستحقاق")}</th></tr></thead><tbody>${taskDetailRows}</tbody></table>
</body>
</html>`;
}
