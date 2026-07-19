import { NextResponse } from "next/server";

// Force dynamic rendering - this route uses cookies
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const response = NextResponse.json({
    message: "Logged out successfully",
  });

  // Clear the auth token cookie
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  });

  return response;
}
