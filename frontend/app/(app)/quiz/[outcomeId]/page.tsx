import { outcomeStaticParams } from "@/lib/outcomeParams";
import QuizPage from "./QuizPage";

// Static export: one page per learning outcome, generated at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return outcomeStaticParams();
}

export default function Page() {
  return <QuizPage />;
}
