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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "search":
        return await searchUsers(request, session.user.id);
      case "pending":
        return await getPendingRequests(session.user.id);
      case "friends":
        return await getFriends(session.user.id);
      case "feed":
        return await getFriendsScores(session.user.id, request);
      case "friend-scores":
        return await getFriendScores(session.user.id, request);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Friends API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, targetUserId } = body;

    switch (action) {
      case "send":
        return await sendFriendRequest(session.user.id, targetUserId);
      case "accept":
        return await respondToFriendRequest(session.user.id, targetUserId, "accepted");
      case "decline":
        return await respondToFriendRequest(session.user.id, targetUserId, "declined");
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Friends API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function searchUsers(request: NextRequest, currentUserId: string) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const result = await pool.query(`
      SELECT id, name, username
      FROM "user"
      WHERE (username ILIKE $1 OR name ILIKE $1)
        AND id != $2
      LIMIT 10
    `, [`%${query}%`, currentUserId]);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}

async function sendFriendRequest(senderId: string, receiverId: string) {
  if (senderId === receiverId) {
    return NextResponse.json({ error: "Cannot send friend request to yourself" }, { status: 400 });
  }

  try {
    // Check if request already exists
    const existing = await pool.query(`
      SELECT id, status FROM friend_requests
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [senderId, receiverId]);

    if (existing.rows.length > 0) {
      const request = existing.rows[0];
      if (request.status === 'accepted') {
        return NextResponse.json({ error: "You are already friends" }, { status: 400 });
      }
      return NextResponse.json({ error: "Friend request already exists" }, { status: 400 });
    }

    // Create friend request
    await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES ($1, $2, 'pending')
    `, [senderId, receiverId]);

    return NextResponse.json({ success: true, message: "Friend request sent" });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}

async function respondToFriendRequest(userId: string, senderId: string, status: string) {
  try {
    // Update the friend request
    const result = await pool.query(`
      UPDATE friend_requests
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE sender_id = $2 AND receiver_id = $3 AND status = 'pending'
      RETURNING id
    `, [status, senderId, userId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
    }

    // If accepted, add to friends table
    if (status === 'accepted') {
      await pool.query(`
        INSERT INTO friends (user_id, friend_id)
        VALUES ($1, $2), ($2, $1)
      `, [userId, senderId]);
    }

    return NextResponse.json({
      success: true,
      message: status === 'accepted' ? "Friend request accepted" : "Friend request declined"
    });
  } catch (error) {
    console.error("Respond to friend request error:", error);
    return NextResponse.json({ error: "Failed to respond to friend request" }, { status: 500 });
  }
}

async function getPendingRequests(userId: string) {
  try {
    const result = await pool.query(`
      SELECT fr.id, fr.sender_id, fr.created_at,
             u.name, u.username
      FROM friend_requests fr
      JOIN "user" u ON fr.sender_id = u.id
      WHERE fr.receiver_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [userId]);

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Get pending requests error:", error);
    return NextResponse.json({ error: "Failed to get pending requests" }, { status: 500 });
  }
}

async function getFriends(userId: string) {
  try {
    // First, let's check what data exists in the friends table
    const debugResult = await pool.query('SELECT * FROM friends WHERE user_id = $1 OR friend_id = $1', [userId]);
    console.log('Friends table data for user', userId, ':', debugResult.rows);

    const result = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.username, f.created_at
      FROM friends f
      JOIN "user" u ON (
        (f.user_id = $1 AND f.friend_id = u.id) OR
        (f.friend_id = $1 AND f.user_id = u.id)
      )
      WHERE u.id != $1
      ORDER BY f.created_at DESC
    `, [userId]);

    console.log('Final friends result for user', userId, ':', result.rows);

    return NextResponse.json({ friends: result.rows });
  } catch (error) {
    console.error("Get friends error:", error);
    return NextResponse.json({ error: "Failed to get friends list" }, { status: 500 });
  }
}

async function getFriendsScores(userId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get recent scores from all friends
    const result = await pool.query(`
      SELECT DISTINCT
        s.id,
        s.score,
        s.description,
        s.date,
        s.created_at,
        u.id as user_id,
        u.name as user_name,
        u.username as user_username
      FROM scores s
      JOIN friends f ON (
        (f.user_id = $1 AND f.friend_id = s.user_id) OR
        (f.friend_id = $1 AND f.user_id = s.user_id)
      )
      JOIN "user" u ON s.user_id = u.id
      WHERE s.user_id != $1
      ORDER BY s.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return NextResponse.json({ scores: result.rows });
  } catch (error) {
    console.error("Get friends scores error:", error);
    return NextResponse.json({ error: "Failed to get friends scores" }, { status: 500 });
  }
}

async function getFriendScores(userId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get("friendId");
    const limit = parseInt(searchParams.get("limit") || "30");

    if (!friendId) {
      return NextResponse.json({ error: "Friend ID required" }, { status: 400 });
    }

    // Check if they are actually friends
    const friendCheck = await pool.query(`
      SELECT 1 FROM friends
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, friendId]);

    if (friendCheck.rows.length === 0) {
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });
    }

    // Get friend's score history
    const scoresResult = await pool.query(`
      SELECT s.id, s.score, s.description, s.date, s.created_at
      FROM scores s
      WHERE s.user_id = $1
      ORDER BY s.date DESC
      LIMIT $2
    `, [friendId, limit]);

    // Get friend info
    const friendResult = await pool.query(`
      SELECT id, name, username
      FROM "user"
      WHERE id = $1
    `, [friendId]);

    return NextResponse.json({
      friend: friendResult.rows[0],
      scores: scoresResult.rows
    });
  } catch (error) {
    console.error("Get friend scores error:", error);
    return NextResponse.json({ error: "Failed to get friend scores" }, { status: 500 });
  }
}