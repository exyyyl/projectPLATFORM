import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export function RichTextEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Начните писать...</p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
      },
    },
  })

  return <EditorContent editor={editor} />
}
