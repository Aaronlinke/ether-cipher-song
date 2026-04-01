import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  color?: string;
}

export function KaTeXRenderer({ latex, displayMode = false, className = '', color }: KaTeXRendererProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false,
      });
    } catch {
      return `<span style="color:#ef4444">${latex}</span>`;
    }
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      style={color ? { color } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
