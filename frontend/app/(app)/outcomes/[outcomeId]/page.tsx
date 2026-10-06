import { outcomeStaticParams } from "@/lib/outcomeParams";
import OutcomeDetailPage from "./OutcomeDetailPage";

// Static export: one page per learning outcome, generated at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return outcomeStaticParams();
}

export default function Page() {
  return <OutcomeDetailPage />;
}
