import { NextRequest, NextResponse } from "next/server";
import { createRepositoryFromEnv, AsanaApiError } from "@/lib/asana/repository";

export const dynamic = "force-dynamic";

/** On-demand subtask drill-down for a single task — never bulk-fetched. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId query parameter." }, { status: 400 });
  }

  const { repository, missingEnvVars } = createRepositoryFromEnv();
  if (!repository) {
    return NextResponse.json({ error: `Not configured: ${missingEnvVars.join(", ")}` }, { status: 503 });
  }

  try {
    const subtasks = await repository.fetchSubtasks(taskId);
    return NextResponse.json({ subtasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = err instanceof AsanaApiError && err.status ? err.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
