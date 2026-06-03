# Local Development Startup Guide

> **AI INSTRUCTION:** When the user mentions "start.md", you must execute the following workflow to boot up the Timesheet Management System v3.0 locally.

## Startup Sequence

1. **Start the Backend Server**
   Run the following terminal command to boot the Node.js Express server:
   `node server/index.js`
   *Ensure the backend is running on port 3001 before proceeding.*

2. **Start the Frontend Server**
   Run the following terminal command to start the Vite application:
   `npm run dev`
   *This will launch the frontend on port 3000.*

3. **Provide Access Link**
   Provide the user with the active local link: **[http://localhost:3000](http://localhost:3000)**

## Important System Context

- **Database:** Local MySQL via XAMPP running on custom port `3307`.
- **System Version:** v3.0
- **Emergency Access Credentials:**
  - Username/Key: `Superadmin@tcfadmin`
