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
          // Clear any existing content
          elementRef.current.innerHTML = '';
          
          // Generate unique ID for this render
          const diagramId = `${id}-svg`;
          
          // Render the mermaid diagram
          const { svg } = await mermaid.render(diagramId, content.trim());
          
          // Insert the SVG
          if (elementRef.current) {
            elementRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          // Show error fallback
          if (elementRef.current) {
            elementRef.current.innerHTML = `
              <div class="p-4 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                Failed to render Mermaid diagram
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