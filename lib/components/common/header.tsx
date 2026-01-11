'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/lib/components/ui/select';
import type { Account } from '#/lib/db/schema';

import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { ClientOnlySelect } from './client-only-select';
import { useTranslation } from '#/lib/hooks/useTranslation';

function Header({
  account,
  accounts,
}: {
  account: Account;
  accounts: Account[];
}) {
  const r = useRouter();
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 flex h-16 items-center gap-2 border-b bg-background px-2 py-2 animate-slide-in-from-top">
      <Image
        src="/logo.png"
        width={100}
        height={100}
        alt="logo"
        className="h-11 w-11 rounded-xl"
        draggable="false"
      />
      <h1 className="text-xl font-semibold">
        {t('SkyGram')}
      </h1>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <ClientOnlySelect
          value={account.id}
          onValueChange={(id) => {
            r.push(`/account/${id}`);
          }}
          triggerClassName="w-[180px]"
        >
          <SelectGroup>
            <SelectLabel className="text-xs">
              {t('Accounts')}
            </SelectLabel>
            {accounts.map(({ id, name }) => (
              <SelectItem value={id} key={id}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>

          <div className="px-2 py-2">
            <Link href="/add-account">
              <Button
                size="xs"
                className="w-full"
              >
                {t('Add account')}
              </Button>
            </Link>
          </div>
        </ClientOnlySelect>
      </div>
    </div>
  );
}

export default Header;
