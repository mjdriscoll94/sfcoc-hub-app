'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  QueueListIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string | {
    type: string;
    content: Array<{
      type: string;
      attrs?: { level?: number };
      content?: Array<{ type: string; text: string }>;
    }>;
  };
  onChange: (html: string) => void;
}

const editorStyles = `
  .ProseMirror {
    min-height: 12rem;
    height: auto;
    padding: 1rem;
  }

  .dark .ProseMirror {
    color: white !important;
    background-color: transparent !important;
  }

  .dark .ProseMirror * {
    color: white !important;
  }

  .dark .ProseMirror[contenteditable="true"] {
    color: white !important;
    caret-color: white;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: #9ca3af;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .dark .ProseMirror p.is-editor-empty:first-child::before {
    color: #666;
  }

  .dark .ProseMirror *::selection {
    background-color: rgba(255, 255, 255, 0.2) !important;
  }
`;

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        paragraph: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
        bold: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
        italic: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'dark:text-white',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-coral underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline.configure({
        HTMLAttributes: {
          class: 'dark:text-white underline',
        },
      }),
      TextStyle,
      Color,
    ],
    content: typeof content === 'string' ? content : (content || '<p></p>'),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      console.log('Editor content:', editor.getJSON());
      console.log('Generated HTML:', html);
      const cleanHtml = html
        .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
        .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
        .replace(/\n/g, '')
        .replace(/contenteditable="true"/g, '')
        .replace(/class="ProseMirror"/g, '')
        .replace(/text-gray-[0-9]+/g, '')
        .replace(/<p([^>]*)>/g, '<p class="dark:text-white"$1>')
        .replace(/<h1([^>]*)>/g, '<h1 class="dark:text-white"$1>')
        .replace(/<h2([^>]*)>/g, '<h2 class="dark:text-white"$1>')
        .replace(/<ul([^>]*)>/g, '<ul class="dark:text-white"$1>')
        .replace(/<ol([^>]*)>/g, '<ol class="dark:text-white"$1>')
        .replace(/<li([^>]*)>/g, '<li class="dark:text-white"$1>')
        .replace(/<strong([^>]*)>/g, '<strong class="dark:text-white"$1>')
        .replace(/<em([^>]*)>/g, '<em class="dark:text-white"$1>')
        .replace(/<u([^>]*)>/g, '<u class="dark:text-white"$1>');
      onChange(cleanHtml);
    },
    parseOptions: {
      preserveWhitespace: true,
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none dark:prose-p:text-white dark:prose-headings:text-white dark:prose-strong:text-white dark:prose-em:text-white dark:prose-ul:text-white dark:prose-ol:text-white dark:prose-li:text-white',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      try {
        // Try to parse as JSON first
        const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Check if it's a valid TipTap document structure
        if (jsonContent.type === 'doc' && Array.isArray(jsonContent.content)) {
          editor.commands.setContent(jsonContent);
        } else {
          // If not a valid TipTap document, treat as HTML
          editor.commands.setContent(content);
        }
        
        // Set cursor to the end
        editor.commands.focus('end');
      } catch (e) {
        // If JSON parsing fails, treat as HTML
        editor.commands.setContent(content);
        editor.commands.focus('end');
      }
    }
  }, [content, editor]);

  // Add autofocus to empty paragraphs
  useEffect(() => {
    if (editor) {
      const handleUpdate = () => {
        const isEmpty = editor.isEmpty;
        if (isEmpty) {
          editor.commands.focus();
        }
      };
      editor.on('update', handleUpdate);
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="relative">
      <style>{editorStyles}</style>
      <div className="mb-2 flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-white/5 rounded-t-md border-b border-gray-200 dark:border-white/10">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Heading 1"
        >
          <span className="font-bold text-gray-900 dark:text-white text-lg">H1</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Heading 2"
        >
          <span className="font-bold text-gray-900 dark:text-white text-base">H2</span>
        </button>
        <div className="w-px h-6 my-auto bg-gray-300 dark:bg-white/20" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('bold') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Bold"
        >
          <BoldIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('italic') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Italic"
        >
          <ItalicIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('underline') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Underline"
        >
          <UnderlineIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
        <div className="w-px h-6 my-auto bg-gray-300 dark:bg-white/20" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('bulletList') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Bullet List"
        >
          <ListBulletIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('orderedList') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Numbered List"
        >
          <QueueListIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
        <div className="w-px h-6 my-auto bg-gray-300 dark:bg-white/20" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Align Left"
        >
          <span className="font-bold text-gray-900 dark:text-white">←</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Align Center"
        >
          <span className="font-bold text-gray-900 dark:text-white">↔</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Align Right"
        >
          <span className="font-bold text-gray-900 dark:text-white">→</span>
        </button>
        <div className="w-px h-6 my-auto bg-gray-300 dark:bg-white/20" />
        <button
          type="button"
          onClick={toggleLink}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-white/10 ${
            editor.isActive('link') ? 'bg-gray-300 dark:bg-white/20' : ''
          }`}
          title="Add Link"
        >
          <LinkIcon className="w-5 h-5 text-gray-900 dark:text-white" />
        </button>
      </div>
      <div className="bg-white dark:bg-white/10 rounded-b-md border border-gray-200 dark:border-white/10">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}