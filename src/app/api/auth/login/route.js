import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, createToken } from "@/config/auth";

// Force dynamic rendering - this route uses database and cookies
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await getUserByEmail(email);
    
    if (!user) {
      // Explicitly clear any existing auth cookie on failed login
      const errorResponse = NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
      errorResponse.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
      });
      return errorResponse;
    }

    // Verify password
    if (!verifyPassword(password, user.Password)) {
      // Explicitly clear any existing auth cookie on failed login
      const errorResponse = NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
      errorResponse.cookies.set("auth-token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
      });
      return errorResponse;
    }

    // Only create token and set cookie if authentication is successful
    const token = createToken(user.User_ID, user.Email);

    // Set HTTP-only cookie
    const response = NextResponse.json({
      message: "Login successful",
      userId: user.User_ID,
      email: user.Email,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    // Clear cookie on any server error
    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
    errorResponse.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
    return errorResponse;
  }
}
