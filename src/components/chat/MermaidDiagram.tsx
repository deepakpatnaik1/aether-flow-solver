import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  content: string;
  id: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ content, id }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (elementRef.current && content.trim()) {
        try {
          // Initialize mermaid if not already done
          mermaid.initialize({ 
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              darkMode: true,
              background: 'transparent',
              primaryColor: 'hsl(var(--primary))',
              primaryTextColor: 'hsl(var(--foreground))',
              primaryBorderColor: 'hsl(var(--border))',
              lineColor: 'hsl(var(--border))',
              secondaryColor: 'hsl(var(--muted))',
              tertiaryColor: 'hsl(var(--accent))',
            },
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: 14,
            securityLevel: 'loose'
          });
          
          // Clear any existing content
          elementRef.current.innerHTML = '';
          
          // Generate unique ID for this render
          const diagramId = `${id}-svg-${Date.now()}`;
          
          // Validate mermaid syntax
          const trimmedContent = content.trim();
          console.log('Rendering mermaid diagram:', trimmedContent);
          
          // Render the mermaid diagram
          const { svg } = await mermaid.render(diagramId, trimmedContent);
          
          // Insert the SVG
          if (elementRef.current) {
            elementRef.current.innerHTML = svg;
            console.log('Mermaid diagram rendered successfully');
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          console.log('Failed content:', content);
          // Show error fallback with more details
          if (elementRef.current) {
            elementRef.current.innerHTML = `
              <div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <div class="font-medium mb-2">⚠️ Failed to render Mermaid diagram</div>
                <div class="text-xs opacity-75">Check console for details</div>
                <details class="mt-2">
                  <summary class="cursor-pointer text-xs">Show raw content</summary>
                  <pre class="mt-1 p-2 bg-muted/20 rounded text-xs overflow-auto max-h-32">${content}</pre>
                </details>
              </div>
            `;
          }
        }
      }
    };

    renderDiagram();
  }, [content, id]);

  return (
    <div className="my-4 p-4 bg-muted/20 rounded-lg border overflow-hidden">
      <div className="mermaid-container" style={{ textAlign: 'center' }}>
        <div ref={elementRef} className="mermaid" />
      </div>
    </div>
  );
};