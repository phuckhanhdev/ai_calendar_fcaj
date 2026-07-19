import { NextResponse } from "next/server";
import { createUser, createToken, hashPassword, verifyVerificationTicket } from "@/config/auth";

// Force dynamic rendering - this route uses database and cookies
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, password, userData } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Verify one-time ticket from current browser session.
    const ticket = req.cookies.get("verify-ticket")?.value;
    const payload = ticket ? verifyVerificationTicket(ticket) : null;
    if (!payload || String(payload.email).toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json(
        { error: "Phiên xác thực không hợp lệ hoặc đã hết hạn. Vui lòng xác nhận mã lại." },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = hashPassword(password);
    const { userId } = await createUser(email, hashedPassword, userData || {});

    // Create JWT token
    const token = createToken(userId, email);

    // Set HTTP-only cookie
    const response = NextResponse.json({
      message: "Account created successfully",
      userId,
      email,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    // Verification ticket is single-use for account creation.
    response.cookies.set("verify-ticket", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
