import {
  AlignLeft,
  Columns3,
  File,
  Heading,
  Image,
  LayoutGrid,
  Link,
  List,
  Minus,
  MousePointerClick,
  MoveVertical,
  AppWindow,
  ListCollapse,
  Menu,
  PanelTop,
  PanelsTopLeft,
  Smile,
  Video,
  Repeat,
  Pilcrow,
  Rows3,
  Square,
  SquareCheck,
  SquareChevronDown,
  Tag,
  TextCursorInput,
  Table2,
  ChartColumn,
  CalendarDays,
  SquareKanban,
  MessagesSquare,
  PanelBottom,
  TrendingUp,
  Gauge,
  type LucideIcon,
} from 'lucide-react'
import { BRICKS } from '../model/bricks'
import type { BrickType } from '../model/types'

const ICONS: Record<string, LucideIcon> = {
  file: File,
  square: Square,
  columns: Columns3,
  rows: Rows3,
  grid: LayoutGrid,
  card: PanelTop,
  repeat: Repeat,
  tabs: PanelsTopLeft,
  accordion: ListCollapse,
  modal: AppWindow,
  navbar: Menu,
  video: Video,
  smile: Smile,
  heading: Heading,
  text: Pilcrow,
  link: Link,
  tag: Tag,
  list: List,
  button: MousePointerClick,
  input: TextCursorInput,
  textarea: AlignLeft,
  checkbox: SquareCheck,
  select: SquareChevronDown,
  image: Image,
  divider: Minus,
  spacer: MoveVertical,
  table: Table2,
  chart: ChartColumn,
  calendar: CalendarDays,
  kanban: SquareKanban,
  chat: MessagesSquare,
  tabbar: PanelBottom,
  stat: TrendingUp,
  progress: Gauge,
}

export function BrickIcon({ type, size = 16 }: { type: BrickType; size?: number }) {
  const Icon = ICONS[BRICKS[type].icon] ?? Square
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />
}

/** Pastille colorée (couleur de la famille) contenant l'icône de la brique. */
export function BrickBadge({ type, size = 'md' }: { type: BrickType; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 13 : size === 'lg' ? 20 : 16
  return (
    <span className={`pm-brick-badge pm-brick-badge-${size}`} data-cat={BRICKS[type].category}>
      <BrickIcon type={type} size={px} />
    </span>
  )
}
