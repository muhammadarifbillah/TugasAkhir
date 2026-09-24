import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/runner/session";
import { streamContainerLogs } from "@/lib/runner/docker";

interface RouteProps {
  params: Promise<{ projectId: string }>;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

/** Streams `docker logs -f` as Server-Sent Events for the run terminal. */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const runSession = getSession(projectId);
  if (!runSession) {
    return new NextResponse("event: end\ndata: \n\n", { headers: SSE_HEADERS });
  }

  const raw = streamContainerLogs(runSession.containerName);
  const sse = raw.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split(/\r?\n/)) {
          if (line.length > 0) {
            controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
          }
        }
      },
    }),
  );

  return new NextResponse(sse, { headers: SSE_HEADERS });
}
