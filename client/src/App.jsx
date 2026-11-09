import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Loaded up-front: the landing page, login, and the route guard.
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

// Everything below is code-split: each page is downloaded only when visited.
// Public pages
const About = lazy(() => import("./pages/About.jsx"));
const HowItWorks = lazy(() => import("./pages/HowItWorks.jsx"));
const Causes = lazy(() => import("./pages/Causes.jsx"));
const CauseDetails = lazy(() => import("./pages/CauseDetails.jsx"));
const NGOs = lazy(() => import("./pages/NGOs.jsx"));
const NGODetails = lazy(() => import("./pages/NGODetails.jsx"));
const Impact = lazy(() => import("./pages/Impact.jsx"));
const Stories = lazy(() => import("./pages/Stories.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Signup = lazy(() => import("./pages/Signup.jsx"));
const DashboardHome = lazy(() => import("./pages/DashboardHome.jsx"));

// Donor portal
const DonorLayout = lazy(() => import("./components/portal/DonorLayout.jsx"));
const DonorHome = lazy(() => import("./pages/donor/DonorHome.jsx"));
const DonorNgos = lazy(() => import("./pages/donor/DonorNgos.jsx"));
const DonorNgoDetail = lazy(() => import("./pages/donor/DonorNgoDetail.jsx"));
const DonorSevaKarma = lazy(() => import("./pages/donor/DonorSevaKarma.jsx"));
const DonorWallet = lazy(() => import("./pages/donor/DonorWallet.jsx"));
const DonorSchedule = lazy(() => import("./pages/donor/DonorSchedule.jsx"));
const DonorDonations = lazy(() => import("./pages/donor/DonorDonations.jsx"));
const DonorAmbassador = lazy(() => import("./pages/donor/DonorAmbassador.jsx"));
const DonorProfile = lazy(() => import("./pages/donor/DonorProfile.jsx"));
const DonorContact = lazy(() => import("./pages/donor/DonorContact.jsx"));

// NGO portal
const NGOLayout = lazy(() => import("./components/layout/NGOLayout.jsx"));
const NGOHome = lazy(() => import("./pages/ngo/NGOHome.jsx"));
const NGOSectionPage = lazy(() => import("./pages/ngo/NGOSectionPage.jsx"));
const NGOVerification = lazy(() => import("./pages/ngo/NGOVerification.jsx"));
const NGODonations = lazy(() => import("./pages/ngo/NGODonations.jsx"));
const NGOAnalytics = lazy(() => import("./pages/ngo/NGOAnalytics.jsx"));
const NGOContact = lazy(() => import("./pages/ngo/NGOContact.jsx"));
const NGOSettings = lazy(() => import("./pages/ngo/NGOSettings.jsx"));
// Named exports need a small adapter for React.lazy
const NGOImpactReportList = lazy(() =>
    import("./pages/ngo/NGOImpactReports.jsx").then((m) => ({ default: m.NGOImpactReportList }))
);
const NGOImpactReportEditor = lazy(() =>
    import("./pages/ngo/NGOImpactReports.jsx").then((m) => ({ default: m.NGOImpactReportEditor }))
);

// Admin portal
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome.jsx"));
const VerificationQueue = lazy(() => import("./pages/admin/VerificationQueue.jsx"));
const VerificationDetail = lazy(() => import("./pages/admin/VerificationDetail.jsx"));
const adminPage = (name) =>
    lazy(() => import("./pages/admin/AdminPages.jsx").then((m) => ({ default: m[name] })));
const AdminUsers = adminPage("AdminUsers");
const AdminDonations = adminPage("AdminDonations");
const AdminPayments = adminPage("AdminPayments");
const AdminPayouts = adminPage("AdminPayouts");
const AdminAgents = adminPage("AdminAgents");
const AdminImpact = adminPage("AdminImpact");
const AdminAudit = adminPage("AdminAudit");
const AdminEnquiries = adminPage("AdminEnquiries");

function PageLoader() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center p-10 text-sm text-[#64716B]">
            Loading…
        </div>
    );
}

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
        <Suspense fallback={<PageLoader />}>
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
                <Route element={<ProtectedRoute allowedRoles={["DONOR", "NGO", "ADMIN"]} />}>
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
                        <Route path="schedule" element={<DonorSchedule />} />
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

                {/* Protected admin portal */}
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
        </Suspense>
    );
}
