import type { LucideIcon } from 'lucide-react'
import {
  Combine,
  Scissors,
  RotateCw,
  LayoutGrid,
  Droplets,
  Image,
  FileImage,
  Minimize2,
  FileText,
  Eye,
  Shield,
  Highlighter,
  ClipboardEdit,
  PenLine,
  Replace,
  ScanLine,
  Layers,
  Sparkles,
  Bot,
} from 'lucide-react'

export type ToolId =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'organize'
  | 'watermark'
  | 'images-to-pdf'
  | 'pdf-to-images'
  | 'compress'
  | 'metadata'
  | 'viewer'
  | 'redact'
  | 'annotate'
  | 'fill-form'
  | 'sign'
  | 'find-replace'
  // Pro tools (unlocked with the $29 tier)
  | 'ocr'
  | 'batch'
  | 'ai-summarize'
  | 'ai-ask'

export interface Tool {
  id: ToolId
  name: string
  description: string
  icon: LucideIcon
  accept: string
  multiple: boolean
  /** Requires the Pro tier — opens an upgrade prompt instead of the tool. */
  pro?: boolean
  /** Roadmap feature — shown as "Soon" and not yet available. */
  soon?: boolean
}

export const tools: Tool[] = [
  {
    id: 'merge',
    name: 'Merge PDFs',
    description: 'Combine multiple PDFs into one document in any order.',
    icon: Combine,
    accept: 'application/pdf',
    multiple: true,
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Extract pages or split into separate files by range.',
    icon: Scissors,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'rotate',
    name: 'Rotate Pages',
    description: 'Rotate all pages or selected pages by 90°, 180°, or 270°.',
    icon: RotateCw,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'organize',
    name: 'Organize Pages',
    description: 'Reorder, delete, or duplicate pages with drag and drop.',
    icon: LayoutGrid,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'watermark',
    name: 'Add Watermark',
    description: 'Stamp text watermarks across every page.',
    icon: Droplets,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'redact',
    name: 'Redact Text',
    description: 'Permanently remove sensitive text — matches are rasterised out, not just covered.',
    icon: Shield,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'find-replace',
    name: 'Find & Replace',
    description: 'Search for text across your PDF and replace it in one go.',
    icon: Replace,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'annotate',
    name: 'Annotate PDF',
    description: 'Highlight, underline, and add comment notes to any page.',
    icon: Highlighter,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'fill-form',
    name: 'Fill Forms',
    description: 'Complete fillable PDF forms with text fields and checkboxes.',
    icon: ClipboardEdit,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'sign',
    name: 'Sign PDF',
    description: 'Draw, type, or upload a signature and place it on any page.',
    icon: PenLine,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    description: 'Convert JPG, PNG, or WebP images into a single PDF.',
    icon: Image,
    accept: 'image/*',
    multiple: true,
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    description: 'Export each page as a high-quality PNG image.',
    icon: FileImage,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size by optimizing the PDF structure.',
    icon: Minimize2,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'metadata',
    name: 'Edit Metadata',
    description: 'View and edit title, author, subject, and keywords.',
    icon: FileText,
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'viewer',
    name: 'View PDF',
    description: 'Open multiple PDFs in tabs and switch between them instantly.',
    icon: Eye,
    accept: 'application/pdf',
    multiple: true,
  },
  {
    id: 'ocr',
    name: 'OCR — Make Searchable',
    description: 'Recognize text in scanned PDFs and images so you can search and copy it.',
    icon: ScanLine,
    accept: 'application/pdf',
    multiple: false,
    pro: true,
  },
  {
    id: 'batch',
    name: 'Batch Process',
    description: 'Run any tool across dozens of PDFs at once — merge, compress, watermark in bulk.',
    icon: Layers,
    accept: 'application/pdf',
    multiple: true,
    pro: true,
  },
  {
    id: 'ai-summarize',
    name: 'AI Summarize',
    description: 'Get a clear summary of any PDF, generated on your device.',
    icon: Sparkles,
    accept: 'application/pdf',
    multiple: false,
    pro: true,
  },
  {
    id: 'ai-ask',
    name: 'Ask AI',
    description: 'Chat with your document — ask questions and get answers with citations.',
    icon: Bot,
    accept: 'application/pdf',
    multiple: false,
    pro: true,
    soon: true,
  },
]