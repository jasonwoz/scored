import { NextRequest, NextResponse } from "next/server";
import { auth, pool } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get complete user profile including username
    const result = await pool.query(`
      SELECT id, email, name, username
      FROM "user"
      WHERE id = $1
    `, [session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}