'use client';

import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '#/lib/components/ui/select';

type ClientOnlySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  triggerClassName?: string;
 contentClassName?: string;
};

export function ClientOnlySelect({
  value,
  onValueChange,
  children,
  triggerClassName,
  contentClassName
}: ClientOnlySelectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Возвращаем простой div, чтобы избежать гидратации
    return <div className={triggerClassName || "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"} />;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {children}
      </SelectContent>
    </Select>
  );
}