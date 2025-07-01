'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import type { Config } from 'isomorphic-dompurify';

interface RichTextContentProps {
  content: string;
}

// Configure DOMPurify to allow certain tags and attributes
const purifyConfig: Config = {
  ALLOWED_TAGS: ['p', 'h1', 'h2', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'br'],
  ALLOWED_ATTR: ['href', 'class', 'style'],
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false,
};

export default function RichTextContent({ content }: RichTextContentProps) {
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content, purifyConfig);
  }, [content]);

  return (
    <>
      <style>
        {`
          .rich-text-content.prose :where(h1):not(:where([class~="not-prose"] *)) {
            font-size: 2.25rem !important;
            line-height: 1.2 !important;
            margin-top: 1.5rem !important;
            margin-bottom: 1rem !important;
          }
          .rich-text-content.prose :where(h2):not(:where([class~="not-prose"] *)) {
            font-size: 1.5rem !important;
            line-height: 1.3 !important;
            margin-top: 1.25rem !important;
            margin-bottom: 0.75rem !important;
          }
        `}
      </style>
      <div 
        className="rich-text-content prose prose-invert prose-white max-w-none
          prose-h1:font-bold prose-h1:text-white
          prose-h2:font-bold prose-h2:text-white
          prose-p:text-gray-300 prose-p:mb-4 
          prose-a:text-coral prose-a:no-underline hover:prose-a:underline 
          prose-strong:text-white 
          prose-ul:text-gray-300 prose-ol:text-gray-300 
          prose-li:text-gray-300 prose-li:marker:text-gray-400 
          prose-hr:border-gray-700 
          prose-blockquote:text-gray-300 prose-blockquote:border-gray-700 
          prose-table:text-gray-300 prose-th:text-white prose-td:text-gray-300"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </>
  );
} 