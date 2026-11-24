import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
    short_name: 'ASSDI Portal',
    description: 'শিক্ষার্থী লার্নিং প্রগ্রেস, ফিডব্যাক ও ম্যানেজমেন্ট সিস্টেম - স্মল বিজনেস ম্যানেজমেন্ট কোর্স (SBMC)',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F8FAF9',
    theme_color: '#1B4D3E',
    orientation: 'portrait-primary',
    lang: 'bn',
    categories: ['education', 'productivity', 'management'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'আজকের ক্লাস ও উপস্থিতি',
        short_name: 'উপস্থিতি',
        description: 'আজকের ক্লাস শিডিউল ও উপস্থিতি দেখুন',
        url: '/student',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'লেকচার শিট ও রিসোর্স',
        short_name: 'লেকচার শিট',
        description: 'ক্লাসের স্টাডি মেটেরিয়াল ও পিডিএফ ডাউনলোড',
        url: '/student',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'ডিজিটাল আইডি কার্ড',
        short_name: 'আইডি কার্ড',
        description: 'ডিজিটাল স্টুডেন্ট আইডি ও এডমিট কার্ড',
        url: '/student/id-card',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
