
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  ARCHIVED = 'archived',
  WAITING_FLOW = 'waiting_flow'
}

export interface ResponsiveStyle {
  // Mobile/Tablet overrides
  fontSize?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  marginTop?: string;
  marginBottom?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  width?: string;
  display?: 'block' | 'none';
}

export interface EmailBlockStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat';
  contentBackgroundColor?: string;
  color?: string;

  // Typography
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: string;
  letterSpacing?: string;

  // Spacing (Desktop default)
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;

  // Border & Radius
  borderRadius?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomLeftRadius?: string;
  borderBottomRightRadius?: string;

  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderColor?: string;
  borderTopWidth?: string;
  borderBottomWidth?: string;
  borderLeftWidth?: string;
  borderRightWidth?: string;

  // Shadow
  shadowBlur?: string;
  shadowColor?: string;
  shadowSpread?: string;
  shadowX?: string;
  shadowY?: string;

  width?: string;
  maxWidth?: string;
  height?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

  // Flex / Layout
  verticalAlign?: 'top' | 'middle' | 'bottom';

  // Social specific (Global)
  iconColor?: string;
  iconBackgroundColor?: string;
  iconSize?: string;
  iconMode?: 'color' | 'dark' | 'light' | 'original' | 'custom';
  iconShape?: 'circle' | 'rounded' | 'square';
  gap?: string;
  iconPadding?: string; // New: Padding inside the icon box

  // Countdown specific
  targetDate?: string; // ISO string for countdown target
  digitColor?: string;
  labelColor?: string;

  // Timeline specific
  timelineDotColor?: string;
  timelineLineColor?: string;
  timelineLineStyle?: 'solid' | 'dashed' | 'dotted';
  timelineDotShape?: 'circle' | 'square';

  // Review specific
  starSize?: string;
  starColor?: string;

  // Responsive Overrides
  mobile?: ResponsiveStyle;
  tablet?: ResponsiveStyle;

  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  display?: string;

  // Background Overlay
  overlayColor?: string;
  overlayOpacity?: number; // 0 to 1

  // Video Specific
  playButtonColor?: string;

  // Check List Specific
  checkIconColor?: string;
  checkIconSize?: string;
  checkIconBackgroundColor?: string;
  checkIcon?: string;
  checkIconMode?: 'icon' | 'image';
  checkCustomIconUrl?: string;
  showCheckListTitle?: boolean;
  showItemTitle?: boolean;
  showItemDescription?: boolean;
  checkIconVerticalAlign?: 'top' | 'middle' | 'bottom';

  // Table Specific
  tableRows?: number;            // number of data rows (excluding header)
  tableCols?: number;            // number of columns
  tableHeaderRow?: boolean;      // show styled header row
  tableHeaderBg?: string;        // header background color
  tableHeaderTextColor?: string; // header text color
  tableStripe?: 'alternate' | 'solid'; // row color mode
  tableEvenBg?: string;          // even row background
  tableOddBg?: string;           // odd row background
  tableSolidBg?: string;         // solid row background
  tableBorderColor?: string;     // border color
  tableBorderWidth?: string;     // border width px
  tableColWidths?: string[];     // per-column widths ('auto', '120px', '25%')
  tableColAligns?: string[];     // per-column default text alignment
  tableCellPadding?: string;     // cell padding (e.g. '8px 12px')
  tableFontSize?: string;        // base font size for all cells
  tableEvenTextColor?: string;   // text color for even data rows
  tableOddTextColor?: string;    // text color for odd data rows
  tableLastRowBg?: string;       // special background for last row
  tableLastRowTextColor?: string;
  tableLastColBg?: string;       // special background for last column
  tableLastColTextColor?: string;

  noStack?: boolean;
  checkIndividualIcons?: boolean;
}

export interface SocialLink {
  id: string;
  network: string; // Changed to string to support 'custom' or dynamic keys
  url: string;
  imageUrl?: string; // For custom images/favicons
  // Deep customization per icon
  customStyle?: {
    iconColor?: string;
    backgroundColor?: string;
  };
}

export interface ListItem {
  id: string;
  title: string;
  description: string;
  date?: string;
  icon?: string;
  customIconUrl?: string;
}

export interface TableCell {
  content: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  bg?: string;      // cell-level background override
  color?: string;   // cell-level text color override
}

export type EmailBlockType = 'section' | 'row' | 'column' | 'text' | 'image' | 'button' | 'spacer' | 'divider' | 'social' | 'video' | 'html' | 'list' | 'header' | 'countdown' | 'quote' | 'timeline' | 'review' | 'order_list' | 'check_list' | 'table';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: string;          // For table: JSON string of TableCell[][]
  url?: string;
  altText?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  socialLinks?: SocialLink[];
  items?: ListItem[];
  rating?: number;
  style: EmailBlockStyle;
  children?: EmailBlock[];
  checkListTitle?: string;
}

export interface EmailBodyStyle {
  backgroundColor: string;
  backgroundImage?: string;
  contentWidth: string;
  contentBackgroundColor: string;
  fontFamily: string;
  linkColor: string;
  // Background Image Options
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundRepeat?: 'no-repeat' | 'repeat';
}

export interface TemplateGroup {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  category: 'newsletter' | 'promotional' | 'transactional' | 'welcome' | 'event' | string;
  groupId?: string;
  lastModified: string;
  blocks: EmailBlock[];
  bodyStyle: EmailBodyStyle;
  htmlContent?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
  error?: string; // Some endpoints might return 'error' instead of 'message'
  total?: number;
  has_more?: boolean;
  conversation_id?: string;
}

export interface SubscriberNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface Attachment { id: string; name: string; url: string; size: number; type: string; logic: 'all' | 'match_email'; path?: string; }
export interface CampaignReminder { id: string; type: 'no_open' | 'no_click' | 'always'; triggerMode: 'delay' | 'date'; delayDays: number; delayHours: number; scheduledAt: string; subject: string; templateId: string; }
export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  sentAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  target: {
    listIds: string[];
    segmentIds: string[];
    tagIds: string[];
    individualIds: string[];
  };
  reminders: CampaignReminder[];
  senderEmail: string;
  trackingEnabled: boolean;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    spam: number;
    unsubscribed: number;
    failed: number;
  };
  contentBody?: string;
  templateId?: string;
  attachments?: Attachment[];
  totalTargetAudience?: number;
  linkedFlow?: { id: string; name: string; status: string };
  type?: 'email' | 'zalo_zns';
  config?: {
    oa_config_id?: string;
    mapped_params?: Record<string, string>;
  };
}
export interface Subscriber { id: string; email: string; firstName: string; lastName: string; status: 'active' | 'unsubscribed' | 'lead' | 'customer' | 'bounced' | 'complained'; tags: string[]; joinedAt: string; dateOfBirth?: string | null; anniversaryDate?: string | null; lastActivityAt?: string | null; leadScore?: number; chatCount?: number; listIds: string[]; notes: SubscriberNote[]; stats: { emailsSent: number; emailsOpened: number; linksClicked: number; lastOpenAt?: string; lastClickAt?: string; }; customAttributes: Record<string, any>; gender?: string; phoneNumber?: string; jobTitle?: string; companyName?: string; address?: string; source?: string; activity?: any[]; verified?: boolean | number; avatar?: string; meta_psid?: string; meta_page_id?: string; }
export interface Segment { id: string; name: string; description: string; count: number; criteria: string; autoCleanupDays?: number; }
export interface FlowStep { id: string; type: 'trigger' | 'action' | 'wait' | 'condition' | 'advanced_condition' | 'split_test' | 'link_flow' | 'remove_action' | 'update_tag' | 'list_action' | 'zalo_zns' | 'zalo_cs'; label: string; iconName: string; config: Record<string, any>; nextStepId?: string; yesStepId?: string; noStepId?: string; pathAStepId?: string; pathBStepId?: string; stats?: any; }

// Updated FlowStats to reflect total counts from DB
export interface FlowStats {
  enrolled: number;
  completed: number;
  totalSent: number;
  totalOpened: number;
  uniqueOpened: number;
  totalClicked: number;
  uniqueClicked: number;
  totalFailed?: number;
  totalUnsubscribed?: number;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  steps: FlowStep[];
  stats: FlowStats; // Use updated FlowStats interface
  config: {
    frequencyCap: number;
    activeDays: number[];
    startTime: string;
    endTime: string;
    exitConditions: string[];
    type: 'realtime' | 'batch';
    frequency?: 'one-time' | 'recurring';
    enrollmentCooldownHours?: number;
    allowMultiple?: boolean;
    maxEnrollments?: number;
    bounceBehavior?: 'stop' | 'ignore';
    advancedExit?: any;
  };
  createdAt: string;
  archivedAt?: string;
  trigger_type?: string | null;
}
export interface FormField { id: string; dbField: string; label: string; required: boolean; type: 'text' | 'email' | 'tel' | 'number' | 'date'; isCustom?: boolean; customKey?: string; }
export interface FormDefinition { id: string; name: string; targetListId: string; fields: FormField[]; stats?: { submissions: number; }; notificationEnabled?: boolean; notificationEmails?: string; notificationCcEmails?: string; notificationSubject?: string; }
export interface PurchaseEvent { id: string; name: string; createdAt?: string; stats?: { count: number; }; notificationEnabled?: boolean; notificationEmails?: string; notificationSubject?: string; }
export interface CustomEvent { id: string; name: string; createdAt?: string; stats?: { count: number; }; notificationEnabled?: boolean; notificationEmails?: string; notificationSubject?: string; }

// --- AI & Chat Types ---

export interface FileAttachment {
  id?: string;
  name: string;
  type: string;
  size: number;
  base64?: string;
  previewUrl?: string;
  content?: string; // For streaming/virtual files
  conversationId?: string;
  conversationTitle?: string;
  propertyId?: string;
  source?: string;
  createdAt?: string; // Added from usage
  uploading?: boolean; // true while reading/processing file
  uploadProgress?: number; // 0-100
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  quickActions?: string[];
}

export interface ChatSession {
  id: string;
  visitorId?: string;
  title: string;
  createdAt: number;
  lastMessage?: string;
  messages?: Message[];
  isPinned?: boolean;
}

export interface ChatbotInfo {
  id: string;
  name: string;
  slug?: string;
  description: string;
  category_name?: string;
  settings?: {
    bot_name: string;
    brand_color: string;
    bot_avatar: string;
    welcome_msg: string;
  };
  stats?: {
    docs_count: number;
    queries_count: number;
  };
  domain?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}