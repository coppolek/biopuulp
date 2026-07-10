export type BioLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  tags?: string[];
  clicks?: number;
  description?: string;
  image?: string;
  link_type?: 'standard' | 'youtube' | 'spotify' | 'amazon';
  price?: string;
};

export type SocialLink = {
  platform: 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'linkedin' | 'github' | 'facebook';
  url: string;
};

export type BioModule = 
  | { id: string; type: 'tip_jar'; title: string; description: string; currency: string; suggestedAmounts: number[] }
  | { type: 'digital_product'; id: string; title: string; price: number; fileUrl: string; description: string }
  | { id: string; type: 'booking'; title: string; durationMinutes: number; price: number; description: string }
  | { type: 'microblog'; id: string; title: string; content: string; date: string; imageUrl?: string; videoUrl?: string; tags: string[]; seo?: { title?: string; description?: string } }
  | { id: string; type: 'newsletter'; title: string; description: string; provider: string }
  | { id: string; type: 'embed'; title: string; embedUrl: string; platform: string };

export type BioTheme = {
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontFamily: string;
  backgroundStyle?: 'solid' | 'gradient-animated' | 'mesh' | 'floating-shapes' | 'stars' | 'dots' | 'noise' | 'grid' | 'glassmorphism' | 'aurora' | 'cyberpunk' | 'retro-wave' | 'minimal-lines';
  buttonStyle?: 'solid' | 'outline' | 'glass' | 'neo-brutalism' | 'soft-shadow' | 'glowing';
};

export type BioProfile = {
  name: string;
  bio: string;
  avatarUrl: string;
};

export type DailyStats = {
  date: string;
  views: number;
  clicks: number;
};

export type PageAnalytics = {
  pageId: string;
  dailyStats: DailyStats[];
};

export type BannerType = 'image' | 'code';

export type AppBanner = {
  id: string;
  name: string;
  type: BannerType;
  position: 'top' | 'bottom';
  active: boolean;
  
  // For image banners
  imageUrl?: string;
  linkUrl?: string;
  
  // For code banners
  code?: string;
};

export type BioPage = {
  id: string;
  slug: string;
  customDomain?: string;
  profile: BioProfile;
  theme: BioTheme;
  links: BioLink[];
  socials: SocialLink[];
  modules: BioModule[];
  createdAt: string;
  views: number;
  language?: 'it' | 'en' | 'es';
  layoutOrder?: string[];
  seo?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  pages: BioPage[];
};
