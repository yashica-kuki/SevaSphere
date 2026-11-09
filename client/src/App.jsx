
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Causes from "./pages/Causes.jsx";
import CauseDetails from "./pages/CauseDetails.jsx";
import NGOs from "./pages/NGOs.jsx";
import NGODetails from "./pages/NGODetails.jsx";
import Impact from "./pages/Impact.jsx";
import Stories from "./pages/Stories.jsx";
import About from "./pages/About.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import Contact from "./pages/Contact.jsx";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

import NGOLayout from "./components/layout/NGOLayout.jsx";
import NGOHome from "./pages/ngo/NGOHome.jsx";
import NGOSectionPage from "./pages/ngo/NGOSectionPage.jsx";

import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import VerificationQueue from "./pages/admin/VerificationQueue.jsx";
import VerificationDetail from "./pages/admin/VerificationDetail.jsx";
import { AdminUsers, AdminDonations, AdminPayments, AdminPayouts, AdminAgents, AdminImpact, AdminAudit, AdminEnquiries } from "./pages/admin/AdminPages.jsx";

import DonorLayout from "./components/portal/DonorLayout.jsx";
import DonorHome from "./pages/donor/DonorHome.jsx";
import DonorNgos from "./pages/donor/DonorNgos.jsx";
import DonorNgoDetail from "./pages/donor/DonorNgoDetail.jsx";
import DonorSevaKarma from "./pages/donor/DonorSevaKarma.jsx";
import DonorWallet from "./pages/donor/DonorWallet.jsx";
const DonorSchedule = lazy(() => import("./pages/donor/DonorSchedule.jsx"));
import DonorDonations from "./pages/donor/DonorDonations.jsx";
import DonorAmbassador from "./pages/donor/DonorAmbassador.jsx";
import DonorProfile from "./pages/donor/DonorProfile.jsx";
import DonorContact from "./pages/donor/DonorContact.jsx";

import NGOVerification from "./pages/ngo/NGOVerification.jsx";
import NGODonations from "./pages/ngo/NGODonations.jsx";
import NGOAnalytics from "./pages/ngo/NGOAnalytics.jsx";
import NGOContact from "./pages/ngo/NGOContact.jsx";
import NGOSettings from "./pages/ngo/NGOSettings.jsx";
import { NGOImpactReportList, NGOImpactReportEditor } from "./pages/ngo/NGOImpactReports.jsx";

function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ivory">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-forest">404</h1>
                <p className="mt-2 text-charcoal">Page not found.</p>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            {/* Public pages */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/causes" element={<Causes />} />
            <Route path="/causes/:slug" element={<CauseDetails />} />
            <Route path="/ngos" element={<NGOs />} />
            <Route path="/ngos/:id" element={<NGODetails />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/contact" element={<Contact />} />

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* General protected dashboard */}
            <Route
                element={
                    <ProtectedRoute allowedRoles={["DONOR", "NGO", "ADMIN"]} />
                }
            >
                <Route path="/dashboard" element={<DashboardHome />} />
            </Route>

            {/* Protected donor portal */}
            <Route element={<ProtectedRoute allowedRoles={["DONOR"]} />}>
                <Route path="/donor" element={<DonorLayout />}>
                    <Route index element={<DonorHome />} />
                    <Route path="home" element={<DonorHome />} />
                    <Route path="ngos" element={<DonorNgos />} />
                    <Route path="ngos/:id" element={<DonorNgoDetail />} />
                    <Route path="sevakarma" element={<DonorSevaKarma />} />
                    <Route path="wallet" element={<DonorWallet />} />
                    <Route path="schedule" element={<Suspense fallback={<div className="p-10 text-center text-sm text-[#64716B]">Loading scheduler…</div>}><DonorSchedule /></Suspense>} />
                    <Route path="donations" element={<DonorDonations />} />
                    <Route path="ambassador" element={<DonorAmbassador />} />
                    <Route path="profile" element={<DonorProfile />} />
                    <Route path="contact" element={<DonorContact />} />
                </Route>
            </Route>

            {/* Protected NGO portal */}
            <Route element={<ProtectedRoute allowedRoles={["NGO"]} />}>
                <Route path="/ngo" element={<NGOLayout />}>
                    <Route index element={<NGOHome />} />
                    <Route path="home" element={<NGOHome />} />
                    <Route path="profile" element={<NGOSectionPage />} />
                    <Route path="verification" element={<NGOVerification />} />
                    <Route path="documents" element={<NGOSectionPage />} />
                    <Route path="causes" element={<NGOSectionPage />} />
                    <Route path="donations" element={<NGODonations />} />
                    <Route path="analytics" element={<NGOAnalytics />} />
                    <Route path="impact-reports" element={<NGOImpactReportList />} />
                    <Route path="impact-reports/:id" element={<NGOImpactReportEditor />} />
                    <Route path="contact" element={<NGOContact />} />
                    <Route path="settings" element={<NGOSettings />} />
                    <Route path="initiatives" element={<NGOSectionPage />} />
                </Route>
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminHome />} />
                    <Route path="verifications" element={<VerificationQueue />} />
                    <Route path="verifications/:ngoId" element={<VerificationDetail />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="donations" element={<AdminDonations />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="payouts" element={<AdminPayouts />} />
                    <Route path="agents" element={<AdminAgents />} />
                    <Route path="impact" element={<AdminImpact />} />
                    <Route path="audit" element={<AdminAudit />} />
                    <Route path="enquiries" element={<AdminEnquiries />} />
                </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
