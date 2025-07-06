# Content Spark

Transform YouTube videos into valuable educational content with automated analysis and generation.

## Overview

Content Spark is a full-stack platform that processes YouTube video transcripts and generates various types of educational content. Users can enhance transcripts with additional context, corrections, and insights to improve output quality.

### Key Features

- 📹 **YouTube Video Processing** - Extract transcripts with robust fallback strategies
- ✏️ **Transcript Enhancement** - Add context, corrections, insights, and notes
- 🤖 **Content Generation** - Create summaries, reports, flashcards, and content ideas
- 📚 **Content Organization** - Manage all generated content in a persistent database
- 📱 **Mobile-First Design** - Touch-friendly interface with responsive layouts
- 🔐 **Secure Authentication** - OpenID Connect with automatic token refresh

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + **shadcn/ui** components
- **TanStack Query** for data fetching
- **Wouter** for routing
- **Framer Motion** for animations

### Backend
- **Node.js** + **Express** (ESM modules)
- **PostgreSQL** database
- **Drizzle ORM** for type-safe database operations
- **OpenAI API** integration
- **Passport.js** for authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Replit account (for authentication)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd content-spark
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Create .env file with:
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
SESSION_SECRET=your-session-secret
REPLIT_DOMAINS=your-replit-domain
ISSUER_URL=your-oidc-issuer-url
```

4. Set up the database
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

### Processing Videos

1. Navigate to the dashboard
2. Click "Add New Video"
3. Enter a YouTube URL
4. The system will extract the transcript automatically

### Enhancing Transcripts

1. Open a video from your dashboard
2. Click "Add Enhancement"
3. Choose enhancement type:
   - **Context** - Background information
   - **Corrections** - Fix errors in transcript
   - **Insights** - Add expert knowledge
   - **Questions** - Study questions
   - **Notes** - Personal notes
4. Add timestamps for specific moments (optional)

### Generating Content

1. From the video detail page, choose a content type:
   - **Summary** - Key points and topics
   - **Report** - Medium/LinkedIn style article
   - **Flashcards** - Study cards for learning
   - **Ideas** - Blog titles and social media content
2. Click "Generate" (rate limited to 10/hour)
3. View and manage generated content in respective tabs

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests with Vitest
npm run test:run     # Run tests once
npm run check        # TypeScript type checking
npm run db:push      # Apply database schema changes
```

### Project Structure

```
/client/             # React frontend
├── src/
│   ├── components/  # UI components
│   ├── pages/       # Route components
│   ├── hooks/       # Custom React hooks
│   └── lib/         # Utilities

/server/             # Express backend
├── routers/         # API routes
├── middleware/      # Express middleware
├── openai.ts        # AI integration
├── youtube.ts       # Transcript extraction
└── storage.ts       # Database operations

/shared/
└── schema.ts        # Database schema
```

### API Endpoints

- `GET /api/auth/login` - OIDC login
- `GET /api/auth/logout` - Logout
- `GET /api/auth/user` - Current user info
- `GET /api/videos` - List user's videos
- `POST /api/videos` - Process new video
- `GET /api/videos/:id` - Get video details
- `POST /api/videos/:id/summary` - Generate summary
- `POST /api/videos/:id/report` - Generate report
- `POST /api/videos/:id/flashcards` - Generate flashcards
- `POST /api/videos/:id/ideas` - Generate content ideas
- `POST /api/videos/:id/additional-text` - Add enhancement
- `GET /api/videos/:id/additional-text` - Get enhancements

## Testing

The project uses Vitest for testing with React Testing Library for component tests.

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run
```

Tests include:
- Component rendering and interaction tests
- Hook behavior tests
- Integration tests for transcript enhancement
- Mocked OpenAI responses to avoid API costs

## Deployment

The project is optimized for deployment on Replit:

1. Fork to your Replit account
2. Set environment variables in Replit Secrets
3. The `.replit` and `replit.nix` files handle configuration
4. Database should be PostgreSQL (Replit PostgreSQL recommended)

## Contributing

1. Follow existing code patterns and conventions
2. Keep files under 300 lines - refactor when needed
3. Use existing components from shadcn/ui library
4. Write tests for new features
5. Use TypeScript strictly
6. Follow mobile-first design principles

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Maintain consistent naming conventions
- Document complex logic
- Keep components focused and reusable

## Security

- All routes require authentication except login
- User ownership verified for all resources
- Rate limiting on AI operations (10/hour)
- Session-based authentication with PostgreSQL store
- Environment variables for sensitive data

## Performance

- TanStack Query for efficient data caching
- Skeleton loading states
- Optimistic updates for better UX
- Background AI content generation
- Mobile-optimized with touch gestures

## License

[Add your license here]

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

Built with ❤️ for educators and content creators