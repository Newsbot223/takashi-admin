import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-900 border-blue-200',
  arrived: 'bg-green-100 text-green-900 border-green-200',
  cancelled: 'bg-red-100 text-red-900 border-red-200',
};

/**
 * Русские подписи для персонала — не из reservation_statuses.label_de/en
 * (те зарезервированы под будущие клиентские письма), тот же принцип,
 * что уже используется для ORDER_TYPE_LABELS/SOURCE_LABELS в Orders.
 */
const STATUS_LABELS_RU: Record<string, string> = {
  pending: 'Ожидает подтверждения',
  confirmed: 'Подтверждено',
  arrived: 'Гость пришёл',
  cancelled: 'Отменено',
};

type ReservationStatusBadgeProps = {
  status: string;
};

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {STATUS_LABELS_RU[status] ?? status}
    </Badge>
  );
}
