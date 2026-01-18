-- Delete all users and related data (friend requests and friendships will be deleted automatically due to CASCADE)
DELETE FROM "user";

-- Reset sequences if needed
-- ALTER SEQUENCE "user_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE friend_requests_id_seq RESTART WITH 1;
-- ALTER SEQUENCE friends_id_seq RESTART WITH 1;