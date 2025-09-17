# Aether Flow Solver

**A sophisticated AI-powered strategic advisory system featuring multiple AI personas with persistent memory and real-time collaboration capabilities.**

## 🎯 Project Overview

Aether Flow Solver is an advanced conversational AI platform designed for strategic decision-making and advisory consultation. The system features multiple specialized AI personas that maintain cumulative memory across conversations, enabling deep, contextual strategic guidance.

### Key Features

- **Multi-Persona AI System**: Choose from specialized advisors (Gunnar, Samara, Kirby, Stefan)
- **Persistent Memory**: Dual journal system maintains conversation history and strategic insights
- **Real-time Streaming**: Live AI responses with delta updates
- **File Upload Support**: Attach documents and files to conversations
- **Google Authentication**: Secure login with Google OAuth
- **Advanced Memory Management**: Compressed "artisan cuts" for efficient context retention

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn-ui, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **Storage**: Cloudflare R2
- **AI**: OpenAI GPT-5, GPT-4.1, O3
- **Authentication**: Supabase Auth with Google OAuth

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Cloudflare R2 storage account
- Google OAuth application

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/deepakpatnaik1/aether-flow-solver.git
   cd aether-flow-solver
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Fill in your actual values in `.env`

4. **Supabase Setup**
   - Deploy edge functions: `npx supabase functions deploy`
   - Run migrations: `npx supabase db push`
   - Configure environment variables in Supabase dashboard

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📋 Environment Variables

See `.env.example` for required environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key
- Edge Function variables (set in Supabase dashboard):
  - `OPENAI_API_KEY`: OpenAI API key
  - `R2_ACCESS_KEY_ID`: Cloudflare R2 access key
  - `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key
  - `R2_ACCOUNT_ID`: Cloudflare R2 account ID
  - `R2_BUCKET_NAME`: R2 bucket name

## 🏗️ Architecture

### Frontend Components
- **ChatInterface**: Main conversation interface
- **PersonaBadge**: AI persona selection and display
- **MessageList**: Conversation history with streaming support
- **FileUploadModal**: Document upload functionality

### Backend Services
- **chat-stream**: Streaming AI responses with OpenAI integration
- **superjournal**: Full conversation storage in R2
- **journal**: Compressed conversation summaries
- **upload-file**: File handling and storage
- **schema-discovery**: Database introspection

### Data Flow
1. User sends message through ChatInterface
2. Message streams to chat-stream function
3. AI response streams back in real-time
4. Full conversation saved to superjournal (R2)
5. Compressed summary created for future context

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

### Recommended Hosting
- **Vercel** (recommended): Zero-config deployment
- **Netlify**: Alternative with similar features
- Both platforms offer free tiers with custom domain support

### Domain Configuration
1. Deploy to hosting platform
2. Configure custom domain
3. Update OAuth redirect URLs in Google Console
4. Update Supabase Auth settings with production domain

## 🔒 Security

- Environment variables properly configured
- Google OAuth for secure authentication
- Supabase RLS policies for data protection
- API keys secured in edge functions
- Input validation and sanitization

## 📖 Usage

1. **Authentication**: Login with Google account
2. **Persona Selection**: Choose your AI advisor
3. **Conversation**: Type messages and receive strategic guidance
4. **File Upload**: Attach documents for context
5. **Memory**: AI remembers previous conversations for continuity

## 🤝 Contributing

This project was developed in collaboration with Lovable AI and Claude Code.

## 📄 License

This project is private and proprietary.

---

**Live Demo**: [https://deepakpatnaik.com](https://deepakpatnaik.com) (coming soon)
