import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useFeatureFlagEnabled } from "../providers/posthog";
import PetavueSplash from "./PetavueSplash";
import { MOCK_ENABLED } from "../mocks";

const ExplorePage = lazy(() => import("../pages/ExplorePage"));

export default function IndexRedirect() {
  // Frontend-only mode (the demo): land on Workflows. It is the first of the
  // three questions — what is Petavue doing — and the surface the rest of the
  // product hangs off. The Create-New chat is still one click away in the nav.
  if (MOCK_ENABLED) {
    return <Navigate to="/workflows" replace />;
  }

  const homeEnabled = useFeatureFlagEnabled("ccpoc-home");

  if (homeEnabled === undefined) {
    return <PetavueSplash />;
  }

  if (homeEnabled === true) {
    return <Navigate to="/new" replace />;
  }

  return (
    <Suspense fallback={<PetavueSplash />}>
      <ExplorePage />
    </Suspense>
  );
}
