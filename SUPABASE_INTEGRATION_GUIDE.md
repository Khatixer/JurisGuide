# Supabase Integration Setup Guide

This guide will help you set up Supabase integration for the JurisGuide platform.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Your JurisGuide Next.js project

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `jurisguide-platform`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
5. Click "Create new project"
6. Wait for the project to be set up (2-3 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL
   - Project API Key (anon/public key)

## Step 3: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Edit the `.env.local` file and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema-updated.sql` from your project root
3. Paste it into the SQL Editor and click "Run"
4. This will create all the necessary tables, policies, triggers, and enable realtime

The schema includes:
- **profiles**: User profile information (extends auth.users)
- **cases**: Mediation cases
- **case_participants**: Many-to-many relationship for case participants
- **messages**: Real-time messages for mediation cases

## Step 5: Configure Authentication

1. In Supabase dashboard, go to Authentication > Settings
2. Configure the following:
   - Site URL: `http://localhost:3000` (for development)
   - Redirect URLs: `http://localhost:3000/**`
3. Enable email confirmations if desired (optional for development)

## Step 6: Enable Realtime

The schema automatically enables Supabase Realtime on the messages table for live updates during mediation sessions.

## Step 7: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Open http://localhost:3000
3. The Supabase client is now configured and ready to use

## Features Integrated

### ✅ Authentication
- User registration and login with automatic profile creation
- Session management with middleware protection
- Row Level Security (RLS) policies

### ✅ Database Schema
- **Profiles**: User information with roles (user, lawyer, admin)
- **Cases**: Mediation cases with status tracking
- **Case Participants**: Email-based invitations with user linking
- **Messages**: Real-time messaging with AI mediator support

### ✅ Real-time Features
- Live message updates using Supabase Realtime
- Automatic subscriptions to case-specific channels
- Support for both user and AI mediator messages

### ✅ TypeScript Integration
- Complete type definitions for all database tables
- Type-safe database operations
- Utility functions for common operations

## Available Utility Functions

The integration includes utility functions in `src/lib/supabase/utils.ts`:

- `getProfile(userId)`: Get user profile
- `updateProfile(userId, updates)`: Update user profile
- `getUserCases(userId)`: Get all cases for a user
- `createCase(title, description, createdBy, participantEmails)`: Create new case
- `getCaseWithParticipants(caseId)`: Get case with participant details
- `getCaseMessages(caseId)`: Get all messages for a case
- `sendMessage(caseId, senderId, content, senderType)`: Send a message
- `subscribeToMessages(caseId, callback)`: Subscribe to real-time messages
- `unsubscribeFromMessages(subscription)`: Unsubscribe from messages

## Security Features

- **Row Level Security (RLS)**: All tables have proper RLS policies
- **Authentication Required**: Protected routes require authentication
- **Data Isolation**: Users can only access their own data and cases they participate in
- **Secure API**: Server-side and client-side Supabase clients with proper configuration

## Troubleshooting

### Common Issues

1. **Environment Variables**: Make sure your `.env.local` file has the correct Supabase URL and key
2. **Database Schema**: Ensure the schema was created successfully without errors
3. **RLS Policies**: Verify that Row Level Security policies are working correctly
4. **Realtime**: Check that the messages table is added to the realtime publication

### Getting Help

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Next.js with Supabase: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

## Production Deployment

When deploying to production:

1. Update environment variables with production Supabase URL and keys
2. Configure proper authentication redirects for your domain
3. Set up proper RLS policies for production data
4. Enable email confirmations
5. Set up monitoring and backups
6. Use environment-specific Supabase projects

Your JurisGuide platform is now fully integrated with Supabase! 🎉