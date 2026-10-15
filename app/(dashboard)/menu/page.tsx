import { MenuSoldOutBoard } from '@/components/menu/menu-sold-out-board';
import { getMenuItems } from '@/lib/menu/items';

export default async function MenuPage() {
  const { items, error } = await getMenuItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Speisekarte</h1>
        <p className="text-muted-foreground text-sm">
          Gerichte als ausverkauft markieren. Auf der Website können sie dann nicht bestellt werden.
          „Heute“ wird um Mitternacht automatisch wieder freigegeben.
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm">Speisekarte konnte nicht geladen werden. Bitte Seite neu laden.</p>
      ) : (
        <MenuSoldOutBoard initial={items} />
      )}
    </div>
  );
}
