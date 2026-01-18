import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT email FROM \"user\" WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Username not found" }, { status: 404 });
    }

    return NextResponse.json({ email: result.rows[0].email });
  } catch (error) {
    console.error("Get email by username error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}