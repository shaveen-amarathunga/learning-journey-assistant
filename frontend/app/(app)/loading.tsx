import { Spinner } from "@/components/ui/PageState";

// Shown while an app route segment loads (hard navigation, code-split chunk).
// Rendered inside app/(app)/layout.tsx, so it inherits the page container.
export default function Loading() {
  return <Spinner label="Loading" />;
}
