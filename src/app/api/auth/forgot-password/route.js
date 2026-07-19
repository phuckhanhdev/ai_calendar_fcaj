import { NextResponse } from "next/server";
import { getUserByEmail, generateVerificationCode, storeVerificationCode } from "@/config/auth";
import { sendPasswordResetEmail } from "@/lib/email";

// Force dynamic rendering - this route uses database
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: "If the email exists, a password reset code has been sent",
      });
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    await storeVerificationCode(email, code);

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, code);
    
    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send password reset email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password reset code sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
