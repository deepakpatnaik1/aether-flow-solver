# Project Knowledge Base - AI Business Advisory Chat Platform

## Project Overview
**Type**: AI-powered business advisory chat application  
**Context**: Built for Oovar - European Urban Vehicle Access Regulation (UVAR) compliance platform  
**Tech Stack**: React + TypeScript + Vite + Tailwind CSS + Supabase  
**Status**: Fully functional T=0 implementation  

## Core Features

### 1. Multi-Persona AI Chat System
- **5 Distinct Business Advisor Personas**:
  - **Boss**: Founder/CEO of Oovar with 20 years SaaS/mobility experience  
  - **Gunnar**: Consigliere-in-exile, fintech veteran, YC discipline enforcer
  - **Samara**: Guerrilla strategist, asymmetric growth hacker from logistics startup
  - **Kirby**: First-principles product head, fleet optimization expert
  - **Stefan**: LinkedIn content specialist, EU mobility regulations expert

- **Intelligent Persona Detection**: Auto-selects persona when user types "Gunnar," etc.
- **Persona Persistence**: Remembers selected persona across sessions via localStorage
- **Visual Persona System**: Color-coded badges with semantic design tokens

### 2. Advanced Chat Interface
- **Real-time Streaming**: Server-sent events for token-by-token AI responses
- **Multiple AI Models**: GPT-5, GPT-5 Mini, GPT-4.1, O3 Reasoning
- **Smooth Scrolling**: Optimized scroll behavior with flicker prevention
- **Focus Management**: Auto-focus input on window focus, after dropdowns
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for newlines

### 3. File Upload & Processing System
- **Multi-Category Uploads**:
  - **Personas**: `.md` files processed into `personas` table
  - **Boss Profiles**: Special handling for boss-related content
  - **Journals**: Processed into `journal_entries` table
  - **General**: Stored in `persistent_attachments` table

- **Automatic Processing**: Edge functions convert uploads to database entries
- **File Attachment Display**: Visual file cards with removal capability
- **Upload Modal**: Categorized upload interface

### 4. Comprehensive Database Schema

#### Core Tables:
- **`superjournal_entries`**: Complete conversation history with turn tracking
- **`journal_entries`**: Structured conversation logging
- **`personas`**: AI persona definitions and characteristics  
- **`boss`**: Boss profile information
- **`knowledge_entries`**: Project knowledge and documentation
- **`processes`**: Business process documentation
- **`persistent_attachments`**: Uploaded file metadata
- **`ephemeral_attachments`**: Temporary file storage

#### Key Features:
- **Turn-based Tracking**: Conversations linked by unique turn IDs
- **Attachment Support**: JSONB fields for file metadata
- **Timestamp Management**: Automatic created_at/updated_at fields
- **Model Tracking**: Records which AI model generated responses

### 5. Supabase Edge Functions
- **`chat-stream`**: Handles streaming AI responses with OpenAI integration
- **`upload-file`**: Processes file uploads to Supabase Storage
- **`process-persona-upload`**: Converts persona files to database entries
- **`process-journal-upload`**: Processes journal uploads
- **`superjournal`**: Advanced conversation management

### 6. Design System (Aether Theme)
- **Dark Theme**: Based on "Grim Outlook" color palette
- **Semantic Tokens**: HSL-based color system with CSS custom properties
- **Persona Colors**: Distinct color coding for each advisor
- **Glass Morphism**: Backdrop blur effects on input bar
- **Responsive**: Mobile-first design with max-width containers

#### Color Palette:
```css
--background: 220 13% 18%
--primary: 31 87% 51% (orange)
--persona-boss: 31 87% 51% (orange)
--persona-gunnar: 220 70% 45% (blue)
--persona-samara: 340 70% 50% (magenta)
--persona-kirby: 280 60% 45% (purple)  
--persona-stefan: 140 60% 40% (green)
```

### 7. State Management
- **Custom Hook**: `useChat()` manages messages and journal state
- **Supabase Integration**: Direct client-side database operations
- **Local Persistence**: Model and persona selection cached
- **Real-time Updates**: Live conversation state during streaming

### 8. User Experience Features
- **Auto-complete**: Persona names trigger dropdown selection
- **Status Indicators**: Loading states and connection status
- **Error Handling**: Graceful error messages and recovery
- **Attachment Management**: Visual file handling with preview
- **Conversation History**: Persistent chat history across sessions

## Technical Architecture

### Frontend Structure:
```
src/
├── components/chat/          # Chat interface components
├── hooks/                   # Custom React hooks
├── personas/               # Persona definition files (.md)
├── processes/              # Business process documentation
├── integrations/supabase/  # Database client and types
└── pages/                  # Route components
```

### Backend Structure:
```
supabase/
├── functions/              # Edge functions
└── migrations/            # Database schema changes
```

### Key Dependencies:
- **React 18**: Modern React with hooks
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Supabase**: Backend-as-a-service
- **React Query**: Server state management
- **Mermaid**: Diagram rendering
- **KaTeX**: Math formula rendering

## Business Context

### Oovar Platform Focus:
- **Domain**: European Urban Vehicle Access Regulation compliance
- **Target Market**: Fleet operators, logistics companies
- **Value Proposition**: Simplifying complex EU mobility regulations
- **Competitive Advantage**: Founder-market fit with deep regulatory knowledge

### Advisor Specializations:
- **Boss**: Strategic vision and market expansion
- **Gunnar**: Operational discipline and YC-style growth metrics
- **Samara**: Creative marketing and asymmetric growth tactics
- **Kirby**: Product development and feature prioritization
- **Stefan**: Content marketing and thought leadership

## Development Standards

### Code Quality:
- **TypeScript Strict Mode**: Full type coverage
- **Component Architecture**: Small, focused components
- **Design System**: Semantic tokens, no direct colors
- **Performance**: Optimized rendering and scroll behavior
- **Error Boundaries**: Graceful error handling

### Database Standards:
- **Row Level Security**: Enabled on all tables
- **UUID Primary Keys**: Consistent identifier strategy
- **Timestamp Triggers**: Automatic updated_at management
- **JSON Schema**: Structured attachment metadata

## Future Expansion Opportunities
1. **Authentication System**: User accounts and personalization
2. **Team Collaboration**: Shared conversations and workspaces  
3. **Analytics Dashboard**: Conversation insights and metrics
4. **API Integration**: External data sources for real-time compliance updates
5. **Mobile App**: React Native companion application
6. **Voice Interface**: Speech-to-text conversation support

## Current Limitations
- **No Authentication**: Single-user mode only
- **No Collaboration**: Individual use only
- **Limited File Types**: Markdown and basic file support
- **No Export**: Conversations exist only in database
- **No Search**: No conversation search functionality

This knowledge base represents the complete T=0 implementation of a sophisticated AI business advisory platform, ready for production use and future enhancement.