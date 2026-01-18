import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get current user from session (you'll need to implement this)
    // For now, we'll require user_id as a query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user's scores, ordered by date descending
    const result = await pool.query(`
      SELECT id, score, description, date, created_at
      FROM scores
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2
    `, [userId, limit]);

    return NextResponse.json({ scores: result.rows });
  } catch (error) {
    console.error("Get scores error:", error);
    return NextResponse.json({ error: "Failed to get scores" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, score, description } = body;

    if (!userId || score === undefined || score < 0 || score > 100) {
      return NextResponse.json({
        error: "Valid userId and score (0-100) required"
      }, { status: 400 });
    }

    // Insert or update score for today
    const result = await pool.query(`
      INSERT INTO scores (user_id, score, description, date)
      VALUES ($1, $2, $3, CURRENT_DATE)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        score = EXCLUDED.score,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, score, description, date, created_at
    `, [userId, score, description || null]);

    return NextResponse.json({
      success: true,
      score: result.rows[0]
    });
  } catch (error) {
    console.error("Save score error:", error);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scoreId = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!scoreId || !userId) {
      return NextResponse.json({ error: "Score ID and User ID required" }, { status: 400 });
    }

    const result = await pool.query(`
      DELETE FROM scores
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [scoreId, userId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Score not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete score error:", error);
    return NextResponse.json({ error: "Failed to delete score" }, { status: 500 });
  }
}