# Scored - Daily Score Tracking App

A Next.js application for logging daily scores (0-100) with descriptions, featuring user authentication, friend systems, and social features.

## Features

- ✅ **Daily Score Logging** (0-100 with descriptions)
- ✅ **Score History** with visual progress tracking
- ✅ Email & password authentication
- ✅ Username-based authentication
- ✅ Google OAuth sign-in
- ✅ Friend request system
- ✅ **Friends Feed** - Social score sharing
- ✅ **Friend Profiles** - Individual analytics
- ✅ PostgreSQL database integration
- ✅ Tailwind CSS styling
- ✅ TypeScript support

## Project Structure

```
scored/
├── app/                    # Next.js App Router pages
│   ├── api/auth/[...all]/  # Better Auth API routes
│   ├── dashboard/          # Protected dashboard
│   ├── signin/            # Sign-in page
│   ├── signup/            # Sign-up page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with shadcn/ui variables
├── lib/                   # Shared utilities
│   ├── auth.ts            # Better Auth server configuration
│   ├── client/
│   │   └── auth-client.ts # Better Auth client configuration
│   └── utils.ts           # shadcn/ui utility functions
├── components/            # shadcn/ui components
│   ├── ui/               # UI component primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── card.tsx
│   └── index.ts          # Component exports
├── better-auth_migrations/ # Database migrations
├── next.config.mjs       # Next.js configuration
├── tailwind.config.mjs   # Tailwind with shadcn/ui
├── postcss.config.mjs    # PostCSS configuration
└── components.json       # shadcn/ui configuration
```

## Production Deployment

### Environment Variables
Set these environment variables in your Vercel dashboard:

```env
# Database
DATABASE_URL=your_neon_postgresql_connection_string

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Next.js
NODE_ENV=production
```

### Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add these redirect URIs:
   - `https://scored-ashy.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local development)

### Database Setup
Run the `neon-setup.sql` script in your Neon PostgreSQL database to create all required tables.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   # Database
   DATABASE_URL="postgres://username:password@localhost:5432/database_name"

   # Better Auth
   BETTER_AUTH_SECRET="your-secret-key-here"

   # Google OAuth (for Google sign-in)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **Set up your database:**
   - Ensure PostgreSQL is running
   - Update the database connection string in `lib/auth.ts`
   - Run the database migrations:
     ```sql
     -- Add username support to users table
     ALTER TABLE "user" ADD COLUMN "username" text UNIQUE;

     -- Create friend system tables
     \i migrations/friend_requests.sql

     -- Create scores table for daily logging
     \i migrations/scores.sql
     ```
   - Or run: `npx @better-auth/cli migrate`

4. **Set up Google OAuth (optional):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable **Google Identity API** (not Google+ API)
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Configure OAuth consent screen if prompted
   - Select "Web application" as application type
   - Add these authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Copy Client ID and Client Secret to your `.env.local`

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## Usage

- Visit `/signin` to sign in to an existing account (email/username/password or Google)
- Visit `/signup` to create a new account (email/username/password or Google)
- Access `/dashboard` after authentication (protected route)
- Use the sign out button in the dashboard to log out

## Dashboard Features

### Profile Tab
- View and manage your account information
- See your email, name, username, and user ID

### Friends Tab
- Search for other users by username or name
- Send and receive friend requests
- View your friends list

### Daily Scores Tab
- **Linear slider**: Interactive horizontal slider with color zones (0-100)
- **Color-coded arc segments**: Red (0-33), Yellow (34-66), Green (67-100)
- **Linear slider interface**: Drag the thumb to set score (0-33 red, 34-66 yellow, 67-100 green)
- **Gap at bottom**: Clean design with space at the bottom of the circle
- **Day descriptions**: "Challenging day", "Moderate day", "Great day"
- **Optional notes**: Add descriptions about your day
- **Visual history**: Timeline with color-coded progress bars
- **One score per day**: Updates existing entry if already logged

## Usage

1. **Sign up** with email, username, password, and name
2. **Add friends** in the Dashboard → Friends tab:
   - Search for users by username or name
   - Send friend requests and accept incoming requests
3. **Log daily scores** in the Dashboard → Daily Scores tab:
   - Drag the white thumb along the horizontal slider
   - Watch the bar fill with color as you drag (red → yellow → green)
   - Score updates in real-time from 0 to 100
   - See color changes: Red (0-33), Yellow (34-66), Green (67-100)
4. **View friends' scores** in the Friends Feed:
   - Click "View Friends Feed" in the Friends tab
   - See all your friends' recent scores in an Instagram-style feed
   - Click on any friend to view their detailed profile and score history
   - Add optional descriptions about your day
3. **Add friends** by searching and sending requests
4. **Track progress** with visual score history

## Friend System

The app includes a comprehensive friend system with the following features:

### Finding Friends
- Use the search bar in the Friends tab to find users by username or name
- Search results show user names and usernames
- Click "Add Friend" to send a friend request

### Managing Friend Requests
- View pending friend requests in the Friends tab
- Accept or decline incoming friend requests
- Notifications show the number of pending requests

### Friends List
- View all your accepted friends
- See friend information including names and usernames
- Friends are stored in a dedicated table for easy querying

### Database Schema
The friend system uses two tables:
- `friend_requests`: Stores pending, accepted, and declined friend requests
- `friends`: Stores accepted friendships (bidirectional relationships)

## Authentication Methods

**Email/Password:**
- Sign up with email, username, password, and name
- Sign in with email or username + password

**Google OAuth:**
- Click "Sign in/up with Google" buttons
- Automatically creates account on first sign-in
- No password required
- After Google authentication, you'll be redirected to `/dashboard`

## Troubleshooting

**Google OAuth not redirecting after sign-in:**
1. Ensure your redirect URI is correctly set in Google Cloud Console: `http://localhost:3000/api/auth/callback/google`
2. Check browser console for any errors during OAuth flow
3. Verify your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
4. Make sure the home page (`/`) can detect authentication status and redirect properly