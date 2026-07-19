import { NextResponse } from "next/server";
import { consumeVerificationCode, createVerificationTicket, verifyVerificationTicket } from "@/config/auth";

// Force dynamic rendering - this route uses database
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    // If a valid verify ticket already exists in this session for the same email,
    // allow access without re-consuming code.
    const existingTicket = req.cookies.get("verify-ticket")?.value;
    if (existingTicket) {
      const payload = verifyVerificationTicket(existingTicket);
      if (payload && String(payload.email).toLowerCase() === String(email).toLowerCase()) {
        return NextResponse.json({ message: "Code already verified in this session", valid: true });
      }
    }

    // Consume verification code atomically (one-time hard guarantee).
    const isValid = await consumeVerificationCode(email, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      message: "Code is valid",
      valid: true,
    });
    const ticket = createVerificationTicket(email);
    response.cookies.set("verify-ticket", ticket, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 20 * 60, // 20 minutes
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Code check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
