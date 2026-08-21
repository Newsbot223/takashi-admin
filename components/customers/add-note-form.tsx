'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addCustomerNoteAction } from '@/app/(dashboard)/customers/actions';

const noteSchema = z.object({
  note: z.string().min(1, 'Введите текст заметки'),
});

type NoteInput = z.infer<typeof noteSchema>;

type AddCustomerNoteFormProps = {
  customerId: string;
  onAdded: () => void;
};

export function AddCustomerNoteForm({ customerId, onAdded }: AddCustomerNoteFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: '' },
  });

  async function onSubmit(values: NoteInput) {
    setServerError(null);
    setIsSubmitting(true);

    const result = await addCustomerNoteAction(customerId, values.note);

    setIsSubmitting(false);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    form.reset();
    onAdded();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2 pt-1">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input placeholder="Добавить заметку…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Добавление…' : 'Добавить'}
        </Button>
      </form>
      {serverError ? <p className="text-destructive pt-1 text-sm">{serverError}</p> : null}
    </Form>
  );
}
