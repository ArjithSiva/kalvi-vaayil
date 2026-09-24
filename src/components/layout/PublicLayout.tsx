import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

/**
 * Shell for every pre-authentication route (/, /explore, /login, /register).
 * Pages render only their own content — the header and footer live here so the
 * four pages can never drift apart again.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
