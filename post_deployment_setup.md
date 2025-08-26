# LPG Inventory Management System - Post-Deployment Setup Guide

## Introduction
This guide will help you complete the setup of your LPG Inventory Management System after the initial deployment to Vercel.

## 1. Environment Variables Configuration
After your application is deployed to Vercel, you'll need to configure the environment variables:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## 2. Supabase Database Setup
Run the SQL scripts in your Supabase SQL editor in the following order:

1. `supabase_schema.sql` - Creates all tables and relationships
2. `supabase_auth.sql` - Sets up authentication functions and triggers
3. `supabase_seed.sql` - Adds initial data for testing

## 3. Supabase Authentication Configuration
In your Supabase dashboard:

1. Go to Authentication > Settings
2. Enable the Email provider
3. Add your deployed URL to the Redirect URLs (e.g., https://your-app.vercel.app)
4. Configure Site URL to your deployed URL

## 4. Testing the Application
After completing the setup:

1. Visit your deployed application URL
2. Create a new user account
3. Log in and verify you can:
   - View the dashboard
   - Register new cylinders
   - Scan QR codes
   - Update cylinder statuses

## 5. Role Management
To assign roles to users:

1. In Supabase, go to the Table Editor
2. Open the `profiles` table
3. Edit a user's profile to set their role to 'admin', 'warehouse', or 'delivery'

## 6. Monitoring and Maintenance
- Regularly backup your Supabase database
- Monitor Vercel analytics for performance issues
- Update dependencies periodically to get security fixes

## Troubleshooting
If you encounter issues:

1. Check browser console for JavaScript errors
2. Check Vercel logs for build/runtime errors
3. Check Supabase logs for database errors
4. Verify all environment variables are correctly set

## Support
For additional help, refer to:
- Next.js documentation: https://nextjs.org/docs
- Supabase documentation: https://supabase.io/docs
- Vercel documentation: https://vercel.com/docs