import { LayoutDashboard, HeartHandshake, Sparkles, Wallet, CalendarClock, Receipt, Megaphone, UserRound, MessageSquare } from "lucide-react";
import PortalShell from "./PortalShell";

const navigation = [
  { label: "Overview", path: "/donor/home", icon: LayoutDashboard },
  { label: "Discover NGOs", path: "/donor/ngos", icon: HeartHandshake },
  { label: "SevaKarma Agent", path: "/donor/sevakarma", icon: Sparkles },
  { label: "Wallet & Payments", path: "/donor/wallet", icon: Wallet },
  { label: "Schedule", path: "/donor/schedule", icon: CalendarClock },
  { label: "Donations", path: "/donor/donations", icon: Receipt },
  { label: "Ambassador", path: "/donor/ambassador", icon: Megaphone },
  { label: "Profile & Preferences", path: "/donor/profile", icon: UserRound },
  { label: "Contact", path: "/donor/contact", icon: MessageSquare },
];

export default function DonorLayout() {
  return <PortalShell brandBadge="DONOR" portalLabel="Donor portal" navigation={navigation} subtitle="Give with clarity and control" />;
}
