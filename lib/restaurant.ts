/** Name des Restaurants für Titel/Überschriften der Admin-Seite.
 *  Dieselbe Codebasis läuft für Takashi und Mira — der Name kommt aus der
 *  Vercel-Variable NEXT_PUBLIC_RESTAURANT_NAME (Standard: Takashi). */
export const RESTAURANT_NAME = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Takashi';
export const ADMIN_TITLE = `${RESTAURANT_NAME} Admin`;
