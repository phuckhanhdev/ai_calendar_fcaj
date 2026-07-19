import { NextResponse } from "next/server";
import { generateVerificationCode, storeVerificationCode, getUserByEmail } from "@/config/auth";
import { sendVerificationEmail } from "@/lib/email";

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

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    await storeVerificationCode(email, code);

    // Send verification email
    const emailResult = await sendVerificationEmail(email, code);
    
    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email",
      success: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
