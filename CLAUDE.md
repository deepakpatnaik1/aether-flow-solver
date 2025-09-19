# Aether Flow Solver - Project Documentation

## Project Overview
**Aether** is a founder psychology and business strategy advisory platform designed for Boss (the founder/CEO). It provides AI-powered mentorship through multiple specialized personas, each offering distinct expertise in business strategy, operations, growth, and leadership.

**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + Supabase + OpenAI

## Business Context
- **Primary User**: Boss - the founder who needs strategic guidance and mentorship
- **User's Startup**: Oovar - European Urban Vehicle Access Regulation compliance platform
- **Platform Purpose**: Provide on-demand business advisory through AI personas trained on founder psychology and business strategy

## Core Architecture

### 1. Dual-Call System
The platform uses a sophisticated two-call architecture for each interaction:
- **Call 1**: Real-time streaming response for immediate display to Boss
- **Call 2**: Background "artisan cut" extraction that distills strategic insights for the journal/knowledge base

### 2. Multi-Persona Advisory System
Five distinct AI advisors, each with specialized expertise:

#### Personas:
- **Boss**: Founder/CEO perspective, strategic vision, market expansion
- **Gunnar**: YC-style operational discipline, revenue focus, "default alive" mentality
- **Samara**: Guerrilla growth tactics, asymmetric strategies, creative marketing
- **Kirby**: First-principles product development, fleet optimization expert
- **Stefan**: Content marketing specialist, EU mobility regulations expert

Each persona maintains:
- Unique voice and communication style
- Specialized domain expertise
- Distinct advisory approach
- Color-coded UI representation

### 3. Context Loading Hierarchy
The system loads context in a specific sequence to ensure proper persona behavior:
1. **Boss Profile** - Understanding the user's context and needs
2. **Active Persona** - Loading the selected advisor's personality and expertise
3. **Journal History** - Previous conversation memory for continuity
4. **Persistent Attachments** - Knowledge base and reference documents
5. **User Prompt** - The current question or request

## Data Architecture

### Database Schema
- **`superjournal_entries`**: Complete conversation history with turn tracking
- **`journal_entries`**: Extracted strategic insights (artisan cuts)
- **`personas`**: AI persona definitions and characteristics
- **`boss`**: Boss profile information and context
- **`knowledge_entries`**: Project knowledge and documentation
- **`processes`**: Business process documentation
- **`persistent_attachments`**: Long-term file storage (knowledge base)
- **`ephemeral_attachments`**: Temporary file storage
- **`google_tokens`**: OAuth tokens for Google Workspace integration

### Storage Buckets
- `boss`: Boss profile storage
- `personas`: Persona definition files
- `processes`: System processes (turn protocol, artisan cuts)
- `past-journals`: Historical conversation archives
- `persistent-attachments`: Categorized knowledge base files
- `ephemeral-attachments`: Temporary file uploads

## Key Business Flows

### Conversation Flow
1. Boss sends message with optional persona selection (e.g., "Gunnar, ...")
2. System auto-detects persona from message prefix
3. Call 1 loads full context package and streams response
4. Response displays immediately with typing effect
5. Call 2 (background) extracts strategic essence for journal
6. Both calls write to superjournal for persistence

### File Upload System
- **Categories**: persona, boss, journal, general
- **Auto-processing**: Persona/boss/journal files convert to database entries
- **Context inclusion**: Files loaded into Call 1 context for reference

### Google Integration
- OAuth 2.0 flow with popup authentication
- Scopes: Gmail, Docs, Slides, Drive
- Secure token storage via RPC functions
- Enables personas to create/send documents

## Code Quality Assessment

### Strengths ✅
- TypeScript with proper interfaces
- Component-based architecture
- Modern React patterns (hooks, context)
- Supabase integration with generated types
- Real-time streaming implementation

### Issues ⚠️
- **Inconsistent error handling**: Silent failures throughout
- **Hardcoded credentials**: API keys in frontend code
- **Console logs**: 26 debug statements in production
- **Performance**: No memoization, multiple re-renders
- **Type safety gaps**: `any[]` types, missing error boundaries
- **Security**: Exposed API keys should use environment variables

### Overall Quality: 6/10
Functional but needs refactoring for production readiness.

## Critical Business Rules

1. **Persona Persistence**: Selected persona saved in localStorage
2. **Model Selection**: Multiple AI models with different capabilities
3. **Authentication**: Protected routes with Supabase auth
4. **Turn Protocol**: Specific context loading order for consistency
5. **Artisan Cuts**: Strategic extraction happens asynchronously

## Known Limitations
- Single-user system (no multi-tenancy)
- No error recovery UI
- No token refresh for Google OAuth
- Silent error handling reduces debuggability
- Hardcoded URLs to lovableproject.com

## Development Commands
```bash
npm install        # Install dependencies
npm run dev       # Start development server
npm run build     # Build for production
npm run lint      # Run linter
```

## Environment Variables Required
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Edge Functions (Supabase)
- `chat-stream`: Main AI streaming endpoint
- `artisan-cut-extraction`: Strategic insight extraction
- `google-auth-url`: OAuth URL generation
- `google-oauth`: OAuth callback handler
- `upload-file`: File upload processor
- `process-persona-upload`: Persona file processor
- `superjournal`: Conversation persistence

## Future Improvements Needed
1. **Error Handling**: Implement proper error boundaries and user feedback
2. **Security**: Move API keys to environment variables
3. **Performance**: Add React.memo, useMemo, useCallback optimizations
4. **Testing**: Add unit, integration, and e2e tests
5. **Multi-tenancy**: Support multiple users/organizations
6. **Token Refresh**: Implement Google OAuth token refresh
7. **Monitoring**: Add error tracking and analytics
8. **Documentation**: Add JSDoc comments and Storybook

---
*Last updated: 2025-09-19*
*This document is maintained for Claude AI to understand the project context and architecture.*