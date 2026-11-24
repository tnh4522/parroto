import type { Metadata } from "next";
import { AnalyticsDashboardView } from "@/features/analytics/components/AnalyticsDashboardView";

export const metadata: Metadata = {
  title: "Progress Analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboardView />;
}
