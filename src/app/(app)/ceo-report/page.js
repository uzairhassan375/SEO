import { redirect } from "next/navigation";

/** Legacy route — use Monthly Report */
export default function CeoReportRedirect() {
  redirect("/monthly-report");
}
