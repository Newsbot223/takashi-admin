'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateReservationAction, type ReservationDetail } from '@/app/(dashboard)/reservations/actions';
import { toFriendlyReservationError } from '@/lib/reservations/error-messages';

const editReservationSchema = z.object({
  date: z.string().min(1, 'Bitte Datum angeben'),
  time: z.string().min(1, 'Bitte Uhrzeit angeben'),
  persons: z.coerce.number().int().min(1, 'Mindestens ein Gast'),
  comment: z.string(),
});

type EditReservationInput = z.infer<typeof editReservationSchema>;

type EditReservationDialogProps = {
  reservation: ReservationDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditReservationDialog({
  reservation,
  open,
  onOpenChange,
  onSaved,
}: EditReservationDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditReservationInput>({
    resolver: zodResolver(editReservationSchema),
    values: {
      date: reservation.date,
      time: reservation.time,
      persons: reservation.persons,
      comment: reservation.comment ?? '',
    },
  });

  async function onSubmit(values: EditReservationInput) {
    setServerError(null);
    setIsSubmitting(true);

    const result = await updateReservationAction(reservation.id, values);

    setIsSubmitting(false);

    if (!result.ok) {
      setServerError(toFriendlyReservationError(result.error));
      return;
    }

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reservierung bearbeiten</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uhrzeit</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="persons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anzahl Gäste</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" step="1" {...field} />
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
                  <FormLabel>Kommentar</FormLabel>
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
                {isSubmitting ? 'Wird gespeichert…' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
