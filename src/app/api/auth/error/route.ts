import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error ?? "auth_error")}`, request.url)
  );
}
