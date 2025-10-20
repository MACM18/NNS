import type { SVGProps } from "react";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Download,
  Edit,
  ExternalLink,
  File,
  FileText,
  Filter,
  Folder,
  Github,
  GripVertical,
  ImageIcon,
  Laptop,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Reply,
  Rocket,
  Search,
  Send,
  Server,
  Settings,
  Share2,
  Shield,
  SidebarClose,
  SidebarOpen,
  Trash,
  User,
  X,
  XCircle,
} from "lucide-react";

const Google = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' {...props}>
    <path
      fill='#EA4335'
      d='M12 11.87v3.75h5.3c-.23 1.37-1.59 4.03-5.3 4.03-3.18 0-5.78-2.62-5.78-5.86s2.6-5.86 5.78-5.86c1.81 0 3.02.77 3.71 1.44l2.53-2.44C16.74 5.13 14.62 4 12 4 7.58 4 4 7.58 4 12s3.58 8 8 8c4.62 0 7.7-3.25 7.7-7.83 0-.53-.06-.94-.13-1.3H12z'
    />
    <path
      fill='#34A853'
      d='M5.62 9.69l-2.75-2.13C1.72 8.69 1 10.28 1 12s.72 3.31 1.87 4.44l2.75-2.13C5.24 13.61 5 12.83 5 12s.24-1.61.62-2.31z'
    />
    <path
      fill='#FBBC05'
      d='M12 5.88c1.39 0 2.62.48 3.6 1.28l2.7-2.63C16.95 2.97 14.66 2 12 2 8.23 2 4.89 4.14 3.24 7.56l2.93 2.27C6.88 7.42 9.21 5.88 12 5.88z'
    />
    <path
      fill='#4285F4'
      d='M12 22c2.52 0 4.62-.83 6.16-2.26l-2.84-2.21c-.77.59-1.78.97-3.32.97-3.7 0-5.07-2.66-5.3-4.03H5.32l-2.75 2.13C4.23 19.86 7.79 22 12 22z'
    />
  </svg>
);

export const Icons = {
  logo: Rocket,
  close: X,
  menu: MoreHorizontal,
  spinner: Loader2,
  github: Github,
  mail: Mail,
  arrowRight: ArrowRight,
  externalLink: ExternalLink,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  copy: Copy,
  trash: Trash,
  edit: Edit,
  check: Check,
  upload: Download,
  ImageIcon: ImageIcon,
  File: File,
  FileText: FileText,
  Folder: Folder,
  Filter: Filter,
  GripVertical: GripVertical,
  Laptop: Laptop,
  MessageSquare: MessageSquare,
  Plus: Plus,
  PlusCircle: PlusCircle,
  Reply: Reply,
  Search: Search,
  Send: Send,
  Server: Server,
  Settings: Settings,
  Share2: Share2,
  Shield: Shield,
  SidebarClose: SidebarClose,
  SidebarOpen: SidebarOpen,
  User: User,
  XCircle: XCircle,
  Circle: Circle,
  google: Google,
};
