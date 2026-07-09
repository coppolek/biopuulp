import { BioPage, UserAccount } from './types';

export const MOCK_PAGE: BioPage = {
  id: 'page_1',
  slug: 'marco_studio',
  profile: {
    name: '@marco_studio',
    bio: 'Architect & Product Designer',
    avatarUrl: 'https://i.pravatar.cc/300?img=68'
  },
  theme: {
    backgroundColor: '#ffffff',
    textColor: '#1A1A1A',
    buttonColor: 'transparent',
    buttonTextColor: '#1A1A1A',
    buttonRadius: 'none',
    fontFamily: 'sans-serif'
  },
  links: [
    { id: 'l1', title: 'Portfolio Behance', url: 'https://example.com', clicks: 120, tags: ['work', 'design'] },
    { id: 'l2', title: 'Mio Corso UI/UX 🔥', url: 'https://example.com', clicks: 45, tags: ['course'] },
    { id: 'l3', title: 'Prenota una 1:1', url: 'https://example.com', clicks: 89, tags: ['booking'] }
  ],
  socials: [
    { platform: 'twitter', url: 'https://twitter.com' },
    { platform: 'instagram', url: 'https://instagram.com' },
    { platform: 'youtube', url: 'https://youtube.com' }
  ],
  modules: [
    {
      id: 'tipjar-1',
      type: 'tip_jar',
      title: 'Offrimi un caffè â',
      description: 'Supporta il mio lavoro creativo',
      currency: 'EUR',
      suggestedAmounts: [3, 5, 10]
    },
    {
      type: 'microblog',
      id: 'mb_1',
      title: 'Perché il Minimalismo vince nel Design',
      content: 'Il design minimalista non è solo una tendenza estetica, è un approccio funzionale. Riducendo il rumore visivo, permettiamo agli utenti di concentrarsi su ciò che conta davvero: il contenuto e le azioni.',
      date: '2023-10-25',
      tags: ['Design', 'UX']
    }
  ],
  createdAt: '2023-01-01',
  views: 15420
};

export const MOCK_USER: UserAccount = {
  id: 'user_1',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  pages: [MOCK_PAGE]
};
