import { NextResponse } from "next/server";
import { verifyToken, getUserById } from "@/config/auth";

// Force dynamic rendering - this route uses cookies and database
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // Get token from cookie
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return user data (without password)
    const { Password, ...userData } = user;
    
    return NextResponse.json({
      user: userData,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
