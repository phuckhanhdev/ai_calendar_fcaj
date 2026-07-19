import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createToken, createUser, getUserByEmail, hashPassword } from "@/config/auth";

export const dynamic = "force-dynamic";

const client = new OAuth2Client();

function splitName(fullName) {
  if (!fullName || typeof fullName !== "string") {
    return { firstName: "", lastName: "" };
  }
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

export async function POST(req) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json(
        { error: "Google credential is required" },
        { status: 400 }
      );
    }

    const audience =
      process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!audience) {
      return NextResponse.json(
        { error: "Google OAuth is not configured on server" },
        { status: 500 }
      );
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience
    });
    const payload = ticket.getPayload();

    if (!payload?.email || payload.email_verified !== true) {
      return NextResponse.json(
        { error: "Google account email is not verified" },
        { status: 401 }
      );
    }

    let user = await getUserByEmail(payload.email);
    if (!user) {
      const { firstName, lastName } = splitName(payload.name || "");
      const generatedPassword = hashPassword(`google_${payload.sub}_${Date.now()}`);
      const created = await createUser(payload.email, generatedPassword, {
        FName: firstName,
        LName: lastName,
        Phone_Number: "",
        Date_of_birth: null
      });
      user = { User_ID: created.userId, Email: created.email };
    }

    const token = createToken(user.User_ID, user.Email);
    const response = NextResponse.json({
      message: "Google login successful",
      userId: user.User_ID,
      email: user.Email
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { error: "Google login failed" },
      { status: 500 }
    );
  }
}
