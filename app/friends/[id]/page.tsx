"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { authClient } from "@/lib/client/auth-client";

interface FriendScore {
  id: number;
  score: number;
  description: string | null;
  date: string;
  created_at: string;
}

interface Friend {
  id: string;
  name: string;
  username: string;
}

export default function FriendProfilePage() {
  const params = useParams();
  const friendId = params.id as string;
  const { data: session, isPending, error } = authClient.useSession();

  const [friend, setFriend] = useState<Friend | null>(null);
  const [scores, setScores] = useState<FriendScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        loadFriendData();
      } else if (error || !session) {
        window.location.href = "/signin";
      }
    }
  }, [session, isPending, error, friendId]);

  const loadFriendData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/friends?action=friend-scores&friendId=${friendId}&limit=100`);
      const data = await response.json();

      if (response.ok) {
        setFriend(data.friend);
        setScores(data.scores);
      } else {
        setErrorMessage(data.error || "Failed to load friend data");
      }
    } catch (error) {
      console.error("Error loading friend data:", error);
      setErrorMessage("Failed to load friend data");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 33) return '#ef4444'; // Red
    if (score <= 66) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const getDayDescription = (score: number) => {
    if (score <= 33) return 'Challenging day';
    if (score <= 66) return 'Moderate day';
    return 'Great day';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAverageScore = () => {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, score) => acc + score.score, 0);
    return Math.round(sum / scores.length);
  };

  const getStreakInfo = () => {
    if (scores.length === 0) return { current: 0, longest: 0 };

    // Sort scores by date (most recent first)
    const sortedScores = [...scores].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check if today/yesterday has a score for current streak
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const hasToday = sortedScores.some(s => s.date === today.toISOString().split('T')[0]);
    const hasYesterday = sortedScores.some(s => s.date === yesterday.toISOString().split('T')[0]);

    if (hasToday) currentStreak = 1;
    if (hasYesterday) currentStreak = 2;

    // Calculate streaks from the sorted scores
    for (let i = 0; i < sortedScores.length - 1; i++) {
      const currentDate = new Date(sortedScores[i].date);
      const nextDate = new Date(sortedScores[i + 1].date);
      const diffTime = Math.abs(currentDate.getTime() - nextDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading friend profile...</div>
      </div>
    );
  }

  if (errorMessage || !friend) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{errorMessage || "Friend not found"}</div>
          <button
            onClick={() => window.location.href = '/friends-feed'}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Friends Feed
          </button>
        </div>
      </div>
    );
  }

  const averageScore = getAverageScore();
  const { current: currentStreak, longest: longestStreak } = getStreakInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/friends-feed'}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Friend Profile</h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-gray-600">
              {friend.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{friend.name}</h2>
          <p className="text-gray-500 mb-4">@{friend.username}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{scores.length}</div>
              <div className="text-sm text-gray-500">Days logged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: getScoreColor(averageScore) }}>
                {averageScore}
              </div>
              <div className="text-sm text-gray-500">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentStreak}</div>
              <div className="text-sm text-gray-500">Day streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scores History */}
      <div className="max-w-md mx-auto py-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score History</h3>

        {scores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No scores yet</h4>
            <p className="text-gray-500">Your friend hasn't logged any scores yet!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scores.map((scoreItem) => (
              <div key={scoreItem.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Date and Score */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-500">
                    {formatDate(scoreItem.date)}
                  </div>
                  <div className="text-2xl font-bold" style={{ color: getScoreColor(scoreItem.score) }}>
                    {scoreItem.score}
                  </div>
                </div>

                {/* Day description */}
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {getDayDescription(scoreItem.score)}
                </div>

                {/* Description */}
                {scoreItem.description && (
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {scoreItem.description}
                  </p>
                )}

                {/* Score Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${scoreItem.score}%`,
                      backgroundColor: getScoreColor(scoreItem.score)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}