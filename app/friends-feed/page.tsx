"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/client/auth-client";

interface FriendScore {
  id: number;
  score: number;
  description: string | null;
  date: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_username: string;
}

export default function FriendsFeedPage() {
  const { data: session, isPending, error } = authClient.useSession();
  const [scores, setScores] = useState<FriendScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        loadFriendsScores();
      } else if (error || !session) {
        window.location.href = "/signin";
      }
    }
  }, [session, isPending, error]);

  const loadFriendsScores = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/friends?action=feed&limit=50");
      const data = await response.json();

      if (response.ok) {
        setScores(data.scores);
      } else {
        setErrorMessage(data.error || "Failed to load friends' scores");
      }
    } catch (error) {
      console.error("Error loading friends scores:", error);
      setErrorMessage("Failed to load friends' scores");
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
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading friends' scores...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{errorMessage}</div>
          <button
            onClick={loadFriendsScores}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Friends' Scores</h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto py-4 px-4">
        {scores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No friends' scores yet</h3>
            <p className="text-gray-500 mb-4">When your friends start logging scores, they'll appear here!</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scores.map((scoreItem, index) => (
              <div key={`${scoreItem.user_id}-${scoreItem.id}-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {scoreItem.user_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <button
                        onClick={() => window.location.href = `/friends/${scoreItem.user_id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {scoreItem.user_name}
                      </button>
                      <div className="text-sm text-gray-500">@{scoreItem.user_username}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(scoreItem.date)}
                  </div>
                </div>

                {/* Score Display */}
                <div className="mb-3">
                  <div className="text-3xl font-bold mb-1" style={{ color: getScoreColor(scoreItem.score) }}>
                    {scoreItem.score}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {getDayDescription(scoreItem.score)}
                  </div>
                  {scoreItem.description && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {scoreItem.description}
                    </p>
                  )}
                </div>

                {/* Score Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${scoreItem.score}%`,
                      backgroundColor: getScoreColor(scoreItem.score)
                    }}
                  />
                </div>

                {/* Score Range Indicator */}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}