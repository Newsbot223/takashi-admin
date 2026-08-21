'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateOrderAction, type OrderDetail } from '@/app/(dashboard)/orders/actions';
import { toFriendlyOrderError } from '@/lib/orders/error-messages';

const editOrderSchema = z.object({
  deliveryAddress: z.string(),
  deliveryZone: z.string(),
  comment: z.string(),
  paymentMethod: z.string(),
  estimatedTime: z.string(),
  discount: z.coerce.number().min(0, 'Скидка не может быть отрицательной'),
});

type EditOrderInput = z.infer<typeof editOrderSchema>;

type EditOrderDialogProps = {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditOrderDialog({ order, open, onOpenChange, onSaved }: EditOrderDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditOrderInput>({
    resolver: zodResolver(editOrderSchema),
    values: {
      deliveryAddress: order.deliveryAddress ?? '',
      deliveryZone: order.deliveryZone ?? '',
      comment: order.comment ?? '',
      paymentMethod: order.paymentMethod ?? '',
      estimatedTime: order.estimatedTime ?? '',
      discount: order.discount,
    },
  });

  async function onSubmit(values: EditOrderInput) {
    setServerError(null);
    setIsSubmitting(true);

    const result = await updateOrderAction(order.id, values);

    setIsSubmitting(false);

    if (!result.ok) {
      setServerError(toFriendlyOrderError(result.error));
      return;
    }

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать заказ №{order.orderNumber}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {order.orderType === 'delivery' ? (
              <>
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Адрес доставки</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Зона доставки</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Способ оплаты</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ожидаемое время</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Скидка (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError ? <p className="text-destructive text-sm">{serverError}</p> : null}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение…' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
