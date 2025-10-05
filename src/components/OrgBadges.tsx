import { Badge } from '@/components/ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

type Org = {
  id?: string;
  name?: string;
};

type Props = {
  orgs?: Org[];
};

function OrgBadges(props: Props) {
  const { orgs } = props;
  const list = (orgs ?? []).filter(Boolean);

  if (list.length === 0) {
    return <span className="text-xs text-muted-foreground">参加なし</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {list.map((org) => (
          <Tooltip key={org.id ?? org.name}>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="px-2 py-0.5 max-w-[180px] sm:max-w-[220px] whitespace-nowrap truncate"
              >
                {org.name ?? '-'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="bg-popover">
              <span>{org.name ?? '-'}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export default OrgBadges;
