/**
 * Client-side authentication utilities
 * These functions interact with the auth API endpoints
 */

/**
 * Register a new user (sends verification email)
 */
export async function register(email) {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    return data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

/**
 * Verify email and create account
 */
export async function verifyEmail(email, code, password, userData) {
  try {
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code, password, userData }),
      credentials: "include",
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Verification failed");
    }

    return data;
  } catch (error) {
    console.error("Verification error:", error);
    throw error;
  }
}

/**
 * Login user
 */
export async function login(email, password) {
  let response;
  try {
    response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      let errorMessage = "Login failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        errorMessage = response.statusText || `Login failed with status ${response.status}`;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    
    if (!data || !data.userId) {
      throw new Error("Invalid response from server. Please try again.");
    }
    
    return data;
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Login failed. Please try again.");
  }
}

/**
 * Logout user
 */
export async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email) {
  try {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to send reset code");
    }

    return data;
  } catch (error) {
    console.error("Forgot password error:", error);
    throw error;
  }
}

/**
 * Reset password with verification code
 */
export async function resetPassword(email, code, newPassword) {
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code, newPassword }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Password reset failed");
    }

    return data;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
}

/**
 * Get user ID from current session
 * Returns "guest" if not authenticated
 */
export async function getUserId() {
  try {
    const user = await getCurrentUser();
    return user ? user.User_ID : "guest";
  } catch (error) {
    console.error("Get user ID error:", error);
    return "guest";
  }
}

// Legacy alias for backward compatibility
export const getCognitoUserSub = getUserId;
