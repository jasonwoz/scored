"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/client/auth-client";
import { ScoreWheel } from "@/components/ui/score-wheel";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface FriendRequest {
  id: number;
  sender_id: string;
  name: string;
  username: string;
  created_at: string;
}

interface ScoreData {
  id: number;
  score: number;
  description: string | null;
  date: string;
  created_at: string;
}

export default function DashboardPage() {
  const { data: session, isPending, error } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'scores'>('profile');

  // Friend system state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Profile editing state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Score system state
  const [todayScore, setTodayScore] = useState<number>(50);
  const [todayDescription, setTodayDescription] = useState("");
  const [scoreHistory, setScoreHistory] = useState<ScoreData[]>([]);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/user-profile');
      if (response.ok) {
        const profileData = await response.json();
        setUser(profileData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadFriendsData = async () => {
    try {
      // Load pending requests
      const pendingRes = await fetch('/api/friends?action=pending');
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingRequests(pendingData.requests || []);
      }

      // Load friends list
      const friendsRes = await fetch('/api/friends?action=friends');
      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData.friends || []);
      }
    } catch (error) {
      console.error('Failed to load friends data:', error);
    }
  };

  const loadScoresData = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/scores?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setScoreHistory(data.scores || []);

        // Check if there's already a score for today
        const today = new Date().toISOString().split('T')[0];
        const todaysScore = data.scores?.find((score: ScoreData) =>
          score.date === today
        );

        if (todaysScore) {
          setTodayScore(todaysScore.score);
          setTodayDescription(todaysScore.description || "");
        }
      }
    } catch (error) {
      console.error('Failed to load scores data:', error);
    }
  };

  const updateUsername = async () => {
    if (!user || !newUsername.trim() || newUsername === user.username) {
      setIsEditingUsername(false);
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const response = await fetch('/api/auth/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      });

      if (response.ok) {
        // Reload user profile to get updated data
        await loadUserProfile();
        setIsEditingUsername(false);
        setNewUsername("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update username");
      }
    } catch (error) {
      console.error('Error updating username:', error);
      alert("Failed to update username");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        // Load user profile first, then other data
        loadUserProfile().then(() => {
          loadFriendsData();
          loadScoresData();
        });
      } else if (error || !session) {
        // Only redirect if we're sure there's no session
        window.location.href = "/signin";
      }
    }
  }, [session, isPending, error, user?.id]);

  const handleSubmitScore = async () => {
    if (!user?.id) return;

    setIsSubmittingScore(true);
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          score: todayScore,
          description: todayDescription.trim() || null
        })
      });

      if (response.ok) {
        await loadScoresData(); // Refresh data
        alert('Score saved successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save score');
      }
    } catch (error) {
      console.error('Failed to save score:', error);
      alert('Failed to save score');
    }
    setIsSubmittingScore(false);
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/friends?action=search&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsSearching(false);
  };

  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', targetUserId })
      });

      if (response.ok) {
        alert('Friend request sent!');
        setSearchResults(searchResults.filter(user => user.id !== targetUserId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert('Failed to send friend request');
    }
  };

  const handleRespondToRequest = async (senderId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId: senderId })
      });

      if (response.ok) {
        loadFriendsData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to respond to request');
      }
    } catch (error) {
      console.error('Failed to respond to request:', error);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/signin";
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Scored</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.name || user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'friends'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Friends ({friends.length})
                {pendingRequests.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('scores')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'scores'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Daily Scores
              </button>
            </nav>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Profile</h2>
                <div className="border-t border-gray-200">
                  <dl>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono bg-gray-100 p-2 rounded">
                        {user.email}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {user.name || "Not provided"}
                      </dd>
                    </div>
                    <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Username</dt>
                      <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                        {isEditingUsername ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder={user.username || "Enter username"}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              disabled={isUpdatingProfile}
                            />
                            <button
                              onClick={updateUsername}
                              disabled={isUpdatingProfile || !newUsername.trim()}
                              className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdatingProfile ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingUsername(false);
                                setNewUsername("");
                              }}
                              disabled={isUpdatingProfile}
                              className="px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="font-mono bg-gray-100 p-2 rounded">
                              {user.username || "Not set"}
                            </span>
                            <button
                              onClick={() => {
                                setIsEditingUsername(true);
                                setNewUsername(user.username || "");
                              }}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </dd>
                    </div>
                    <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">User ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono bg-gray-100 p-2 rounded">
                        {user.id}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              {/* User Search */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Find Friends</h3>
                  <div className="max-w-md">
                    <input
                      type="text"
                      placeholder="Search by username or name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearch(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {isSearching && <p className="mt-2 text-sm text-gray-500">Searching...</p>}

                  {searchResults.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Search Results</h4>
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div>
                              <p className="font-medium">{result.name}</p>
                              <p className="text-sm text-gray-500">@{result.username}</p>
                            </div>
                            <button
                              onClick={() => handleSendFriendRequest(result.id)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Add Friend
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Friend Requests */}
              {pendingRequests.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Friend Requests</h3>
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                          <div>
                            <p className="font-medium">{request.name}</p>
                            <p className="text-sm text-gray-500">@{request.username}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToRequest(request.sender_id, 'accept')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondToRequest(request.sender_id, 'decline')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Your Friends ({friends.length})</h3>
                  {friends.length === 0 ? (
                    <p className="text-gray-500">No friends yet. Search for users to add!</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {friends.map((friend) => (
                        <div key={friend.id} className="p-4 border border-gray-200 rounded-md">
                          <p className="font-medium">{friend.name}</p>
                          <p className="text-sm text-gray-500">@{friend.username}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Friends Feed Link */}
              {friends.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">See What Your Friends Are Up To</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        View your friends' daily scores in an Instagram-style feed
                      </p>
                      <button
                        onClick={() => window.location.href = '/friends-feed'}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                      >
                        View Friends Feed
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scores Tab */}
          {activeTab === 'scores' && (
            <div className="space-y-6">
              {/* Today's Score Input */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Score</h3>

                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">How was your day?</h3>
                      <ScoreWheel
                        value={todayScore}
                        onChange={setTodayScore}
                        size={240}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brief description (optional)
                      </label>
                      <textarea
                        value={todayDescription}
                        onChange={(e) => setTodayDescription(e.target.value)}
                        placeholder="How did your day go?"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <button
                      onClick={handleSubmitScore}
                      disabled={isSubmittingScore}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingScore ? "Saving..." : "Save Today's Score"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Score History */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Score History</h3>

                  {scoreHistory.length === 0 ? (
                    <p className="text-gray-500">No scores logged yet. Start by rating your day above!</p>
                  ) : (
                    <div className="space-y-4">
                      {scoreHistory.map((score) => (
                        <div key={score.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                                score.score <= 33 ? 'bg-red-500' :
                                score.score <= 66 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}>
                                {score.score}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {new Date(score.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {score.score <= 33 ? 'Challenging day' :
                                   score.score <= 66 ? 'Moderate day' :
                                   'Great day'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {score.description && (
                            <p className="text-gray-700 mt-2">{score.description}</p>
                          )}

                          <div className="mt-3 flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div
                                  className={`h-3 absolute top-0 left-0 transition-all duration-300 ${
                                    score.score <= 33 ? 'bg-red-500' :
                                    score.score <= 66 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${score.score}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{score.score}/100</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}