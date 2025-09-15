import React from 'react';

interface MarkdownRendererProps {
  content: string;
  persona?: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, persona, className = "" }) => {
  
  // Get persona color based on persona name
  const getPersonaColor = (personaName?: string): string => {
    const normalizedPersona = personaName?.toLowerCase();
    switch (normalizedPersona) {
      case 'boss': return 'hsl(var(--persona-boss))';
      case 'gunnar': return 'hsl(var(--persona-gunnar))';  
      case 'samara': return 'hsl(var(--persona-samara))';
      case 'kirby': return 'hsl(var(--persona-kirby))';
      case 'stefan': return 'hsl(var(--persona-stefan))';
      default: return 'hsl(var(--primary))'; // fallback to primary
    }
  };

  const personaColor = getPersonaColor(persona);
  const renderMarkdown = (text: string): JSX.Element[] => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting code block
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim();
          codeBlockContent = '';
        } else {
          // Ending code block
          inCodeBlock = false;
          elements.push(
            <div key={i} className="my-3 rounded-lg bg-muted/50 border overflow-hidden">
              {codeBlockLanguage && (
                <div className="px-3 py-1 bg-muted/70 text-xs text-muted-foreground border-b">
                  {codeBlockLanguage}
                </div>
              )}
              <pre className="p-3 overflow-x-auto">
                <code className="text-sm font-mono text-foreground">
                  {codeBlockContent}
                </code>
              </pre>
            </div>
          );
          codeBlockContent = '';
          codeBlockLanguage = '';
        }
        continue;
      }

      // If we're in a code block, collect content
      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? '\n' : '') + line;
        continue;
      }

      // Handle headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold text-foreground mt-6 mb-3">
            {processInlineMarkdown(line.slice(2))}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-xl font-semibold text-foreground mt-5 mb-2">
            {processInlineMarkdown(line.slice(3))}
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-lg font-semibold text-foreground mt-4 mb-2">
            {processInlineMarkdown(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Handle blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={i} className="border-l-4 pl-4 py-2 my-2 bg-muted/20 italic text-muted-foreground" 
            style={{ borderLeftColor: personaColor }}>
            {processInlineMarkdown(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Handle unordered lists (-, *, +)
      if (line.match(/^[\-\*\+]\s/)) {
        const listContent = line.replace(/^[\-\*\+]\s/, '');
        elements.push(
          <div key={i} className="flex items-baseline gap-2 my-1">
            <span className="leading-none flex-shrink-0 font-bold" style={{ color: personaColor, lineHeight: '1.4', fontSize: '15px' }}>•</span>
            <div className="flex-1 message-text">
              {processInlineMarkdown(listContent)}
            </div>
          </div>
        );
        continue;
      }

      // Handle ordered lists
      if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          const [, number, listContent] = match;
          elements.push(
            <div key={i} className="flex items-baseline gap-2 my-1">
              <span className="leading-none font-bold flex-shrink-0" style={{ color: personaColor, lineHeight: '1.4', fontSize: '15px' }}>{number}.</span>
              <div className="flex-1 message-text">
                {processInlineMarkdown(listContent)}
              </div>
            </div>
          );
        }
        continue;
      }

      // Handle indented sub-lists
      if (line.match(/^\s{2,}[\-\*\+]\s/) || line.match(/^\s{2,}\d+\.\s/)) {
        const trimmed = line.trim();
        const isNumbered = trimmed.match(/^\d+\.\s/);
        const listContent = isNumbered 
          ? trimmed.replace(/^\d+\.\s/, '') 
          : trimmed.replace(/^[\-\*\+]\s/, '');
        
        elements.push(
          <div key={i} className="flex items-baseline gap-2 my-1 ml-6">
            <span className="leading-none text-sm opacity-70 flex-shrink-0 font-bold" style={{ color: personaColor, lineHeight: '1.4', fontSize: '13px' }}>
              {isNumbered ? '◦' : '◦'}
            </span>
            <div className="flex-1 text-foreground/90 text-sm">
              {processInlineMarkdown(listContent)}
            </div>
          </div>
        );
        continue;
      }

      // Handle horizontal rules
      if (line.match(/^-{3,}$/) || line.match(/^\*{3,}$/)) {
        elements.push(
          <hr key={i} className="my-4 border-border" />
        );
        continue;
      }

      // Handle regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={i} className="message-text">
            {processInlineMarkdown(line)}
          </p>
        );
      } else {
        // Empty line - add spacing
        elements.push(<div key={i} className="h-2" />);
      }
    }

    // Handle any unclosed code block
    if (inCodeBlock && codeBlockContent) {
      elements.push(
        <div key="unclosed-code" className="my-3 rounded-lg bg-muted/50 border overflow-hidden">
          {codeBlockLanguage && (
            <div className="px-3 py-1 bg-muted/70 text-xs text-muted-foreground border-b">
              {codeBlockLanguage}
            </div>
          )}
          <pre className="p-3 overflow-x-auto">
            <code className="text-sm font-mono text-foreground">
              {codeBlockContent}
            </code>
          </pre>
        </div>
      );
    }

    return elements;
  };

  const processInlineMarkdown = (text: string): JSX.Element | string => {
    // Handle inline code first (to avoid processing markdown inside code)
    let parts = text.split(/(`[^`]*`)/);
    const processed: (JSX.Element | string)[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
        // Inline code
        processed.push(
          <code key={i} className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-foreground border">
            {part.slice(1, -1)}
          </code>
        );
      } else {
        // Process other markdown in this part
        processed.push(processOtherInlineMarkdown(part, i));
      }
    }

    // If only one element and it's a string, return it directly
    if (processed.length === 1 && typeof processed[0] === 'string') {
      return processed[0];
    }

    return <>{processed}</>;
  };

  const processOtherInlineMarkdown = (text: string, keyBase: number): JSX.Element | string => {
    let result = text;
    const elements: JSX.Element[] = [];
    let key = 0;

    // Handle links [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const placeholder = `__LINK_${key}__`;
      elements.push(
        <a 
          key={`${keyBase}-link-${key}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 underline"
          style={{ color: personaColor }}
        >
          {linkText}
        </a>
      );
      key++;
      return placeholder;
    });

    // Handle bold **text**
    result = result.replace(/\*\*([^*]+)\*\*/g, (match, boldText) => {
      const placeholder = `__BOLD_${key}__`;
      elements.push(
        <strong key={`${keyBase}-bold-${key}`} className="font-semibold text-foreground">
          {boldText}
        </strong>
      );
      key++;
      return placeholder;
    });

    // Handle italic *text*
    result = result.replace(/\*([^*]+)\*/g, (match, italicText) => {
      const placeholder = `__ITALIC_${key}__`;
      elements.push(
        <em key={`${keyBase}-italic-${key}`} className="italic text-foreground">
          {italicText}
        </em>
      );
      key++;
      return placeholder;
    });

    // If no replacements were made, return the original text
    if (elements.length === 0) {
      return result;
    }

    // Replace placeholders with elements
    const parts = result.split(/(__(?:LINK|BOLD|ITALIC)_\d+__)/);
    const finalElements: (JSX.Element | string)[] = [];

    parts.forEach((part, index) => {
      const linkMatch = part.match(/__LINK_(\d+)__/);
      const boldMatch = part.match(/__BOLD_(\d+)__/);
      const italicMatch = part.match(/__ITALIC_(\d+)__/);

      if (linkMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-link-${linkMatch[1]}`) || part);
      } else if (boldMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-bold-${boldMatch[1]}`) || part);
      } else if (italicMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-italic-${italicMatch[1]}`) || part);
      } else {
        finalElements.push(part);
      }
    });

    return <>{finalElements}</>;
  };

  return (
    <div className={`markdown-content ${className}`}>
      {renderMarkdown(content)}
    </div>
  );
};