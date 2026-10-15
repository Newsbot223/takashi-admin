import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Bitte E-Mail eingeben').email('Bitte gültige E-Mail eingeben'),
  password: z.string().min(1, 'Bitte Passwort eingeben'),
});

export type LoginInput = z.infer<typeof loginSchema>;
