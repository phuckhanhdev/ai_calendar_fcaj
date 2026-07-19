import { NextResponse } from "next/server";
import { verifyCode, getUserByEmail, updateUserPassword, hashPassword } from "@/config/auth";

// Force dynamic rendering - this route uses database
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = await verifyCode(email, code);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update password
    const hashedPassword = hashPassword(newPassword);
    await updateUserPassword(email, hashedPassword);

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
