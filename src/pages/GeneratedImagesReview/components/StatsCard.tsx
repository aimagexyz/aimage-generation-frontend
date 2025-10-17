import { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';

interface StatsCardProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number | string;
  readonly description?: string;
}

export function StatsCard({ icon: Icon, label, value, description }: StatsCardProps) {
  return (
    <Card className="p-4 transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    </Card>
  );
}
