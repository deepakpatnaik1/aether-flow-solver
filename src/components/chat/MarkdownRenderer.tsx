import React, { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  persona?: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, persona, className = "" }) => {
  // State to track checkbox states
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({});
  
  // Initialize checkbox states from content
  useEffect(() => {
    const lines = content.split('\n');
    const initialStates: Record<string, boolean> = {};
    
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)[-*+]\s*\[[ x]\]/i);
      if (match) {
        const checkMatch = line.match(/^(\s*)[-*+]\s*\[([x ])\]/i);
        if (checkMatch) {
          const checkboxId = `checkbox-${index}`;
          initialStates[checkboxId] = checkMatch[2].toLowerCase().trim() === 'x';
        }
      }
    });
    
    setCheckboxStates(initialStates);
  }, [content]);
  
  const handleCheckboxChange = useCallback((checkboxId: string, checked: boolean) => {
    setCheckboxStates(prev => ({
      ...prev,
      [checkboxId]: checked
    }));
  }, []);
  
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
      
      // Handle ASCII art and preformatted text
      if (line.match(/^[\s]*[│┌┐└┘├┤┬┴┼─━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬]+/) || 
          (line.match(/^[\s]*[+\-|\\\/=<>^v#*@&%$]+[\s]*$/) && line.length > 10)) {
        // ASCII art detected - collect consecutive lines
        const asciiLines = [line];
        let j = i + 1;
        while (j < lines.length && 
               (lines[j].match(/^[\s]*[│┌┐└┘├┤┬┴┼─━┃┏┓┗┛┣┫┳┻╋═║╔╗╚╝╠╣╦╩╬]+/) || 
                lines[j].match(/^[\s]*[+\-|\\\/=<>^v#*@&%$\s]+$/))) {
          asciiLines.push(lines[j]);
          j++;
        }
        
        if (asciiLines.length >= 2) {
          elements.push(
            <div key={i} className="my-3 p-3 bg-muted/30 rounded border">
              <pre className="text-sm font-mono text-foreground whitespace-pre overflow-x-auto">
                {asciiLines.join('\n')}
              </pre>
            </div>
          );
          i = j - 1;
          continue;
        }
      }

      // Handle standalone checkboxes FIRST (like "[x] Task")
      if (line.match(/^(\s*)\[[ x]\]/i)) {
        const match = line.match(/^(\s*)\[([x ])\]\s*(.*)$/i);
        if (match) {
          const [, indent, checkMark, text] = match;
          const checkboxId = `checkbox-${i}`;
          const isChecked = checkboxStates[checkboxId] !== undefined ? 
            checkboxStates[checkboxId] : 
            checkMark.toLowerCase().trim() === 'x';
          
          elements.push(
            <div key={i} className="flex items-center gap-3 my-1" style={{ marginLeft: `${indent.length * 0.5}rem` }}>
              <input 
                type="checkbox" 
                checked={isChecked} 
                onChange={(e) => handleCheckboxChange(checkboxId, e.target.checked)}
                className="rounded border-border cursor-pointer"
                style={{ accentColor: personaColor }}
              />
              <span className={`message-text flex-1 cursor-pointer ${isChecked ? 'line-through opacity-75' : ''}`}
                    onClick={() => handleCheckboxChange(checkboxId, !isChecked)}>
                {processInlineMarkdown(text)}
              </span>
            </div>
          );
          continue;
        }
      }

      // Handle checkbox lists SECOND (like "- [x] Task")
      if (line.match(/^(\s*)[-*+]\s*\[[ x]\]/i)) {
        const match = line.match(/^(\s*)[-*+]\s*\[([x ])\]\s*(.*)$/i);
        if (match) {
          const [, indent, checkMark, text] = match;
          const checkboxId = `checkbox-${i}`;
          const isChecked = checkboxStates[checkboxId] !== undefined ? 
            checkboxStates[checkboxId] : 
            checkMark.toLowerCase().trim() === 'x';
          
          elements.push(
            <div key={i} className="flex items-center gap-3 my-1" style={{ marginLeft: `${indent.length * 0.5}rem` }}>
              <input 
                type="checkbox" 
                checked={isChecked} 
                onChange={(e) => handleCheckboxChange(checkboxId, e.target.checked)}
                className="rounded border-border cursor-pointer"
                style={{ accentColor: personaColor }}
              />
              <span className={`message-text flex-1 cursor-pointer ${isChecked ? 'line-through opacity-75' : ''}`}
                    onClick={() => handleCheckboxChange(checkboxId, !isChecked)}>
                {processInlineMarkdown(text)}
              </span>
            </div>
          );
          continue;
        }
      }

      
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
          
          {
            // Regular code block
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
          }
          
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

      // Handle tables
      if (line.includes('|')) {
        // Look ahead to see if this is a table
        const tableLines = [line];
        let j = i + 1;
        
        // Check for separator line (|---|---|)
        if (j < lines.length && lines[j].includes('|') && lines[j].includes('-')) {
          tableLines.push(lines[j]);
          j++;
          
          // Collect table rows
          while (j < lines.length && lines[j].includes('|') && lines[j].trim()) {
            tableLines.push(lines[j]);
            j++;
          }
          
          if (tableLines.length >= 3) {
            // Render table
            const headers = tableLines[0].split('|')
              .map(h => h.trim())
              .filter((h, idx, arr) => {
                // Filter out empty strings at start/end (from leading/trailing |)
                if (idx === 0 || idx === arr.length - 1) return h !== '';
                return true;
              });
            
            const rows = tableLines.slice(2).map(row => {
              const cells = row.split('|')
                .map(cell => cell.trim())
                .filter((cell, idx, arr) => {
                  // Filter out empty strings at start/end (from leading/trailing |)
                  if (idx === 0 || idx === arr.length - 1) return cell !== '';
                  return true;
                });
              // Ensure row has same number of cells as headers
              while (cells.length < headers.length) {
                cells.push('');
              }
              return cells.slice(0, headers.length);
            }).filter(row => row.some(cell => cell !== ''));
            
            elements.push(
              <div key={i} className="my-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-muted/50">
                      {headers.map((header, idx) => (
                        <th key={idx} className="border border-border px-3 py-2 text-left font-medium text-foreground">
                          {processInlineMarkdown(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-muted/20">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-border px-3 py-2 text-foreground">
                            {processInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            
            i = j - 1; // Skip processed lines
            continue;
          }
        }
      }

      // Handle mathematical expressions (LaTeX)
      if (line.includes('$$') || line.includes('$')) {
        // Block math ($$...$$)
        if (line.includes('$$')) {
          const mathMatch = line.match(/\$\$(.*?)\$\$/);
          if (mathMatch) {
            try {
              const html = katex.renderToString(mathMatch[1], { displayMode: true });
              elements.push(
                <div key={i} className="my-3 text-center">
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              );
              continue;
            } catch (error) {
              console.error('KaTeX error:', error);
            }
          }
        }
        
        // Inline math will be handled in processInlineMarkdown
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
          <div key={i} className="flex items-baseline gap-3 my-1 ml-4">
            <span className="leading-none flex-shrink-0 font-bold text-foreground" style={{ lineHeight: '1.4', fontSize: '15px' }}>•</span>
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
            <div key={i} className="flex items-baseline gap-3 my-1 ml-4">
              <span className="leading-none font-bold flex-shrink-0 text-foreground" style={{ lineHeight: '1.4', fontSize: '15px' }}>{number}.</span>
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
          <div key={i} className="flex items-baseline gap-3 my-1 ml-10">
            <span className="leading-none text-sm opacity-70 flex-shrink-0 font-bold text-foreground" style={{ lineHeight: '1.4', fontSize: '13px' }}>
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

    // Handle inline math ($...$)
    result = result.replace(/\$([^$]+)\$/g, (match, mathText) => {
      try {
        const html = katex.renderToString(mathText, { displayMode: false });
        const placeholder = `__MATH_${key}__`;
        elements.push(
          <span 
            key={`${keyBase}-math-${key}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
        key++;
        return placeholder;
      } catch (error) {
        console.error('KaTeX inline error:', error);
        return match; // Return original if error
      }
    });

    // Handle strikethrough ~~text~~
    result = result.replace(/~~([^~]+)~~/g, (match, strikeText) => {
      const placeholder = `__STRIKE_${key}__`;
      elements.push(
        <span key={`${keyBase}-strike-${key}`} className="line-through opacity-75 text-foreground">
          {strikeText}
        </span>
      );
      key++;
      return placeholder;
    });

    // Handle keyboard shortcuts <kbd>Ctrl+C</kbd>
    result = result.replace(/<kbd>([^<]+)<\/kbd>/g, (match, kbdText) => {
      const placeholder = `__KBD_${key}__`;
      elements.push(
        <kbd key={`${keyBase}-kbd-${key}`} className="px-1.5 py-0.5 bg-muted/70 border border-border rounded text-xs font-mono">
          {kbdText}
        </kbd>
      );
      key++;
      return placeholder;
    });

    // Handle highlight ==text==
    result = result.replace(/==([^=]+)==/g, (match, highlightText) => {
      const placeholder = `__HIGHLIGHT_${key}__`;
      elements.push(
        <mark key={`${keyBase}-highlight-${key}`} className="bg-yellow-200/30 px-1 rounded text-foreground">
          {highlightText}
        </mark>
      );
      key++;
      return placeholder;
    });

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
    const parts = result.split(/(__(?:MATH|LINK|BOLD|ITALIC|STRIKE|KBD|HIGHLIGHT)_\d+__)/);
    const finalElements: (JSX.Element | string)[] = [];

    parts.forEach((part, index) => {
      const mathMatch = part.match(/__MATH_(\d+)__/);
      const linkMatch = part.match(/__LINK_(\d+)__/);
      const boldMatch = part.match(/__BOLD_(\d+)__/);
      const italicMatch = part.match(/__ITALIC_(\d+)__/);
      const strikeMatch = part.match(/__STRIKE_(\d+)__/);
      const kbdMatch = part.match(/__KBD_(\d+)__/);
      const highlightMatch = part.match(/__HIGHLIGHT_(\d+)__/);

      if (mathMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-math-${mathMatch[1]}`) || part);
      } else if (linkMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-link-${linkMatch[1]}`) || part);
      } else if (boldMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-bold-${boldMatch[1]}`) || part);
      } else if (italicMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-italic-${italicMatch[1]}`) || part);
      } else if (strikeMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-strike-${strikeMatch[1]}`) || part);
      } else if (kbdMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-kbd-${kbdMatch[1]}`) || part);
      } else if (highlightMatch) {
        finalElements.push(elements.find(el => el.key === `${keyBase}-highlight-${highlightMatch[1]}`) || part);
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