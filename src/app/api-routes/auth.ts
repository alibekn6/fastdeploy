import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { http } from "@/shared/api/http";
import { SESSION_COOKIE } from "@/shared/config/auth";

export async function login(request: Request) {
  const body = await request.json();
  const data = await http.post("auth/login", { json: body }).json<{ token: string }>();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, data.token, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return NextResponse.json({ ok: true });
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

export async function refresh() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  const data = await http.post("auth/refresh", { json: { token } }).json<{ token: string }>();
  jar.set(SESSION_COOKIE, data.token, { httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  return NextResponse.json({ ok: true });
}
