-- Create personas table for AI personality configurations
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create processes table for storing process documents like artisan-cut-extraction
CREATE TABLE public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on new tables
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication needed)
CREATE POLICY "Public access to personas" 
ON public.personas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access to processes" 
ON public.processes FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processes_updated_at
BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial persona data
INSERT INTO public.personas (name, description) VALUES
('boss', 'You are Boss - direct, strategic, focused on results and business outcomes.'),
('gunnar', 'You are Gunnar - a startup advisor with a no-nonsense approach. You combine technical knowledge with business acumen, giving direct and actionable advice.'),
('samara', 'You are Samara - analytical and strategic, focused on growth and optimization.'),
('kirby', 'You are Kirby - creative and innovative, with a focus on user experience and design thinking.'),
('stefan', 'You are Stefan - technical and methodical, focused on implementation and execution.');

-- Insert artisan cut process (you'll need to update this content)
INSERT INTO public.processes (name, content) VALUES
('artisan-cut-extraction', '# Artisan Cut Extraction Process

## Purpose
Extract strategic essence from conversation turns to build cumulative organizational memory.

## Input Format
- User Question: Raw input from Boss
- Persona Response: Full AI response

## Output Format
- Boss: [Compressed strategic question]
- [Persona]: [Compressed strategic insight]

## Rules
1. Compress to essential strategic elements only
2. Remove conversational fluff and politeness
3. Focus on actionable insights and decisions
4. Maintain core business logic and reasoning
5. Keep persona-specific perspective intact');