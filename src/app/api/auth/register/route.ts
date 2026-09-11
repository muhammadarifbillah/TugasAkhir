import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requestIp } from "@/lib/audit";
import { rateLimitedByIp } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/auth/register");
  if (csrfError) return csrfError;

  // Keyed per client IP: a single shared counter would let one caller block
  // registration for everybody while doing nothing against a real flood.
  const ip = requestIp(request) ?? "unknown";
  if (rateLimitedByIp(`register:${ip}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      preferredLanguage: "en",
      role: "developer",
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(
    { message: "Account created successfully", user },
    { status: 201 },
  );
}
