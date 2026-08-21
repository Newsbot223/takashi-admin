import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-900 border-amber-200',
  accepted: 'bg-blue-100 text-blue-900 border-blue-200',
  cooking: 'bg-orange-100 text-orange-900 border-orange-200',
  on_the_way: 'bg-violet-100 text-violet-900 border-violet-200',
  delivered: 'bg-green-100 text-green-900 border-green-200',
  cancelled: 'bg-red-100 text-red-900 border-red-200',
};

type OrderStatusBadgeProps = {
  status: string;
  label: string;
};

export function OrderStatusBadge({ status, label }: OrderStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {label}
    </Badge>
  );
}
