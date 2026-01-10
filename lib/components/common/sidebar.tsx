'use client';

import { motion } from 'framer-motion';
import {
  BookmarkIcon,
  HomeIcon,
  SettingsIcon,
  TrashIcon,
} from 'lucide-react';
import prettyBytes from 'pretty-bytes';

import Link from 'next/link';
import {
  useParams,
  usePathname,
} from 'next/navigation';

import { Card } from '../ui/card';
import FileStats from './file-stats';
import VersionChecker from './version';
import { useTranslation } from '#/lib/hooks/useTranslation';

const optionsKeyMap = [
  'Home',
  'Bookmark',
  'Trash',
  'Settings',
];

function Sidebar({
  stats,
}: {
  stats?: {
    totalFiles: number;
    totalSize: number;
  };
}) {
  const params = useParams();
  const pathname = usePathname();
  const { t } = useTranslation();

  const options = [
    {
      title: t('Home'),
      href: '/account/[accountId]',
      icon: HomeIcon,
    },
    {
      title: t('Bookmark'),
      href: '/account/[accountId]/bookmark',
      icon: BookmarkIcon,
    },
    {
      title: t('Trash'),
      href: '/account/[accountId]/trash',
      icon: TrashIcon,
    },
    {
      title: t('Settings'),
      href: '/account/[accountId]/settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <div
      className={`relative h-full w-60 space-y-4 px-2 pt-2 bg-background`}
    >
      <div className="space-y-1">
        {options.map((option, index) => {
          const hrefTemplate = optionsKeyMap[index];
          const parsed = option.href.replace(
            /\[([^\]]+)\]/g,
            (_, key) => {
              return params?.[key] as string || '';
            },
          );
          const isActive = pathname === parsed;

          return (
            <motion.div key={hrefTemplate}>
              <Link
                href={parsed}
                className={`flex cursor-default items-center gap-2 rounded-lg px-4 py-2 ${
                  isActive
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : ''
                }`}
                draggable="false"
              >
                <option.icon size={20} />
                <span>{option.title}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <FileStats
        totalFiles={stats?.totalFiles || 0}
        totalSize={stats?.totalSize || 0}
      />

      <div className="absolute bottom-0 w-full py-2 text-center">
        <VersionChecker />
      </div>
    </div>
  );
}

export default Sidebar;
