import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import MenuBarNav from "../components/MenuBarNav";
import ImpersonationBanner from "../components/ImpersonationBanner";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { isEmbedded } from "../utils/embed";

export default function RootLayout() {
  useDocumentTitle();
  // Framed into the product, which supplies its own nav — ours would be a
  // second sidebar sitting inside the first.
  const embedded = isEmbedded();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex bg-[var(--bg-primary)]">
        {/* Single unified nav everywhere — the design-system MenuBar. */}
        {!embedded && <MenuBarNav />}
        <main className="flex-1 min-w-0 flex flex-col">
          <ImpersonationBanner />
          <Outlet />
        </main>
        <Toaster
          position="bottom-left"
          toastOptions={{
            style: {
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              color: "var(--text-primary)"
            }
          }}
        />
      </div>
    </QueryClientProvider>
  );
}
