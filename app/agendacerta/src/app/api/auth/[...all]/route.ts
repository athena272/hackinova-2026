import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { AuthConfigError } from "@/lib/auth/env";
import { AUTH_UNAVAILABLE_MESSAGE } from "@/lib/auth/require-session";
import { getAuth } from "@/lib/auth/server";

async function handleAuthRequest(request: Request): Promise<Response> {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    if (!(error instanceof AuthConfigError)) {
      console.error("[/api/auth]", error);
    }
    return NextResponse.json(
      { error: AUTH_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }
}

export const { GET, POST } = toNextJsHandler(handleAuthRequest);
