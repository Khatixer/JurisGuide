# JurisGuide Supabase Integration Setup

This guide will help you set up Supabase as the backend for your JurisGuide platform.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Your JurisGuide project

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

1. In your `client` folder, create a `.env` file:
```bash
cd client
cp .env.example .env
```

2. Edit the `.env` file and add your Supabase credentials:
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema-simple.sql` from your project root
3. Paste it into the SQL Editor and click "Run"
4. This will create all the necessary tables, policies, and sample data

**Note**: If you get any errors, try running the schema in smaller sections. The most important parts are:
- Create the custom types first
- Create the tables
- Enable RLS and create policies
- Insert sample data last

## Step 5: Configure Authentication

1. In Supabase dashboard, go to Authentication > Settings
2. Configure the following:
   - Site URL: `http://localhost:3000` (for development)
   - Redirect URLs: `http://localhost:3000/**`
3. Enable email confirmations if desired (optional for development)

## Step 6: Test the Integration

1. Build and start your application:
```bash
cd client
npm run build
cd ..
node start-simple.js
```

2. Open http://localhost:5000
3. Try registering a new account
4. Test the legal guidance, lawyer matching, and mediation features

## Features Integrated with Supabase

### ✅ Authentication
- User registration and login
- Session management
- User profiles

### ✅ Legal Queries
- Create and store legal questions
- Query history
- Status tracking

### ✅ Legal Guidance
- Store AI-generated guidance
- Link guidance to queries
- Retrieve guidance history

### ✅ Lawyer Profiles
- Store lawyer information
- Search and filter lawyers
- Lawyer ratings and reviews

### ✅ Mediation Cases
- Create mediation cases
- Track case progress
- Case status management

### ✅ Real-time Features
- Live notifications
- Real-time updates
- Subscription to data changes

## Optional Enhancements

### Add OpenAI Integration
To get real AI legal guidance instead of mock responses:

1. Get an OpenAI API key
2. Add to your `.env`:
```env
REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

3. Update the legal guidance service to use OpenAI API

### Add File Storage
For document uploads in mediation cases:

1. In Supabase dashboard, go to Storage
2. Create a bucket called `documents`
3. Set up policies for file access
4. Update the mediation component to handle file uploads

### Add Real-time Chat
For mediation messaging:

1. Create a `messages` table
2. Use Supabase real-time subscriptions
3. Build a chat interface

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your site URL is configured correctly in Supabase
2. **Authentication Errors**: Check that your API keys are correct
3. **Database Errors**: Ensure the schema was created successfully
4. **RLS Errors**: Verify that Row Level Security policies are set up correctly

### Getting Help

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create an issue in your project repository

## Production Deployment

When deploying to production:

1. Update environment variables with production Supabase URL
2. Configure proper authentication redirects
3. Set up proper RLS policies
4. Enable email confirmations
5. Set up monitoring and backups

## Security Considerations

- Never expose your service role key in client-side code
- Use Row Level Security (RLS) for all tables
- Validate all user inputs
- Implement proper error handling
- Use HTTPS in production
- Regularly update dependencies

Your JurisGuide platform is now integrated with Supabase! 🎉