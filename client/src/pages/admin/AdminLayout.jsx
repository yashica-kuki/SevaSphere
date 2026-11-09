import { LayoutDashboard, ShieldCheck, Users, Receipt, CreditCard, Bot, FileCheck2, ScrollText, Inbox, Banknote } from "lucide-react";
import PortalShell from "../../components/portal/PortalShell";

const navigation = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "NGO Verification", path: "/admin/verifications", icon: ShieldCheck },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Donations", path: "/admin/donations", icon: Receipt },
  { label: "Payments", path: "/admin/payments", icon: CreditCard },
  { label: "NGO Payouts", path: "/admin/payouts", icon: Banknote },
  { label: "Agent Monitor", path: "/admin/agents", icon: Bot },
  { label: "Impact Review", path: "/admin/impact", icon: FileCheck2 },
  { label: "Audit Logs", path: "/admin/audit", icon: ScrollText },
  { label: "Enquiries", path: "/admin/enquiries", icon: Inbox },
];

export default function AdminLayout() {
  return <PortalShell dark brandBadge="ADMIN" portalLabel="Administration" navigation={navigation} subtitle="Platform administration" />;
}
