import { NextRequest, NextResponse } from "next/server";
import { auth, pool } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newUsername } = await request.json();

    if (!newUsername || typeof newUsername !== 'string') {
      return NextResponse.json({ error: "Valid username required" }, { status: 400 });
    }

    const trimmedUsername = newUsername.trim();

    // Validate username format (alphanumeric, underscore, dash, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmedUsername)) {
      return NextResponse.json({
        error: "Username must be 3-20 characters and contain only letters, numbers, underscores, and dashes"
      }, { status: 400 });
    }

    // Check if username is already taken by another user
    const existingUser = await pool.query(
      "SELECT id FROM \"user\" WHERE username = $1 AND id != $2",
      [trimmedUsername, session.user.id]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Update the username
    const result = await pool.query(
      "UPDATE \"user\" SET username = $1 WHERE id = $2 RETURNING username",
      [trimmedUsername, session.user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      username: result.rows[0].username
    });
  } catch (error) {
    console.error("Update username error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}