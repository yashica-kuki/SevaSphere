
import { useEffect, useState } from "react";
import NGOCausesSection from "../../components/ngos/NGOCausesSection.jsx";
import NGOInitiativesSection from "../../components/ngos/NGOInitiativesSection.jsx";
import NGODonationsSection from "../../components/ngos/NGODonationsSection.jsx";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Building2,
  ShieldCheck,
  FolderOpen,
  HeartHandshake,
  Wallet,
  ChartNoAxesCombined,
  FileText,
  MessageSquare,
  Settings,
  Save,
  RefreshCw,
  Upload,
  Download,
} from "lucide-react";

const sections = {
  "/ngo/profile": {
    title: "Organization Profile",
    description: "Manage your NGO's legal details, mission, vision and contact information.",
    icon: Building2,
  },
  "/ngo/verification": {
    title: "NGO Verification",
    description: "Track your organization's verification status and review requirements.",
    icon: ShieldCheck,
  },
  "/ngo/documents": {
    title: "Documents",
    description: "Upload and manage your organization's verification documents.",
    icon: FolderOpen,
  },
  "/ngo/causes": {
    title: "Causes & Initiatives",
    description: "Manage the causes and initiatives your organization works on.",
    icon: HeartHandshake,
  },
  "/ngo/initiatives": {
    title: "Initiatives",
    description: "Create and manage projects your organization is working on.",
    icon: HeartHandshake,
  },
  "/ngo/donations": {
    title: "Donations",
    description: "View donations allocated to your organization and their payout status.",
    icon: Wallet,
  },
  "/ngo/analytics": {
    title: "Analytics",
    description: "Understand donation trends, donor activity and cause-wise performance.",
    icon: ChartNoAxesCombined,
  },
  "/ngo/impact-reports": {
    title: "Impact Reports",
    description: "Create and manage reports about your organization's impact.",
    icon: FileText,
  },
  "/ngo/contact": {
    title: "Contact Support",
    description: "Get help with your organization account and platform activities.",
    icon: MessageSquare,
  },
  "/ngo/settings": {
    title: "Settings",
    description: "Manage your organization portal preferences and account settings.",
    icon: Settings,
  },
};

const fetchProfile = async () => {
  const response = await fetch("/api/ngo/profile", {
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load NGO profile.");
  }

  return result.data;
};

const initialForm = {
  organizationName: "",
  legalName: "",
  registrationNumber: "",
  description: "",
  mission: "",
  vision: "",
  website: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  minimumDonation: "",
  logoUrl: "",
  galleryUrls: [],
};

const Field = ({ label, name, value, onChange, type = "text", placeholder }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-[#34483F]" htmlFor={name}>
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      className="w-full rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
    />
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-[#34483F]" htmlFor={name}>
      {label}
    </label>
    <textarea
      id={name}
      name={name}
      rows={4}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      className="w-full resize-y rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#123B32] focus:ring-2 focus:ring-[#123B32]/10"
    />
  </div>
);

const statusStyles = {
  VERIFIED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  ACTION_REQUIRED: "bg-orange-100 text-orange-800",
  SUSPENDED: "bg-gray-100 text-gray-700",
  DRAFT: "bg-gray-100 text-gray-700",
};


const fetchDocuments = async () => {
  const response = await fetch("/api/ngo/documents", {
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load documents.");
  }

  return result.data;
};

const documentTypes = [
  { value: "REGISTRATION_CERTIFICATE", label: "Registration Certificate" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "TAX_CERTIFICATE", label: "Tax Certificate" },
  { value: "BANK_PROOF", label: "Bank Proof" },
  { value: "OTHER", label: "Other Document" },
];

const documentStatusStyles = {
  PENDING: "bg-yellow-100 text-yellow-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  ACTION_REQUIRED: "bg-orange-100 text-orange-800",
};

function DocumentsSection() {
  const queryClient = useQueryClient();

  const [documentType, setDocumentType] = useState(
    "REGISTRATION_CERTIFICATE"
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const {
    data: documents = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ngo-documents"],
    queryFn: fetchDocuments,
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG and PNG files are allowed.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must not exceed 5 MB.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a document.");
      return;
    }

    const payload = new FormData();

    // Append type before document so Multer receives the field first.
    payload.append("type", documentType);
    payload.append("document", selectedFile);

    setUploading(true);

    try {
      const response = await fetch("/api/ngo/documents", {
        method: "POST",
        credentials: "include",
        body: payload,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Document upload failed.");
      }

      toast.success("Document uploaded successfully.");

      setSelectedFile(null);
      event.target.reset();

      await queryClient.invalidateQueries({
        queryKey: ["ngo-documents"],
      });
    } catch (err) {
      toast.error(err.message || "Unable to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document) => {
    setDownloadingId(document.id);

    try {
      const response = await fetch(
        `/api/ngo/documents/${document.id}/download`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        let message = "Unable to download document.";

        try {
          const result = await response.json();
          message = result.message || message;
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = document.fileName || "ngo-document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err.message || "Unable to download document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unknown size";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5EEE8] text-[#123B32]">
            <Upload size={23} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#123B32]">
              Upload verification document
            </h2>
            <p className="mt-1 text-sm text-[#68736D]">
              Submit your organization's documents for verification.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="documentType"
              className="mb-2 block text-sm font-medium text-[#34483F]"
            >
              Document type
            </label>

            <select
              id="documentType"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="w-full rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-sm outline-none focus:border-[#123B32] md:max-w-lg"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="ngoDocument"
              className="mb-2 block text-sm font-medium text-[#34483F]"
            >
              Select document
            </label>

            <input
              id="ngoDocument"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              className="block w-full rounded-xl border border-[#DCE3DC] bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#E5EEE8] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#123B32]"
            />

            <p className="mt-2 text-xs text-[#68736D]">
              Accepted formats: PDF, JPG, PNG. Maximum size: 5 MB.
            </p>

            {selectedFile && (
              <p className="mt-3 text-sm text-[#34483F]">
                Selected: <strong>{selectedFile.name}</strong>
                {" · "}
                {formatFileSize(selectedFile.size)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123B32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1B5144] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={17} />
            {uploading ? "Uploading..." : "Upload document"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#123B32]">
              Uploaded documents
            </h2>
            <p className="mt-1 text-sm text-[#68736D]">
              Track the review status of each submitted document.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3DC] px-4 py-2 text-sm font-medium text-[#123B32]"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-[#68736D]">
            Loading documents...
          </p>
        ) : isError ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error.message || "Unable to load documents."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#DCE3DC] p-10 text-center">
            <FolderOpen
              size={35}
              className="mx-auto text-[#8A9990]"
            />
            <p className="mt-3 font-semibold text-[#123B32]">
              No documents uploaded yet
            </p>
            <p className="mt-1 text-sm text-[#68736D]">
              Upload your organization's verification documents above.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {documents.map((document) => {
              const typeLabel =
                documentTypes.find(
                  (type) => type.value === document.type
                )?.label || document.type;

              return (
                <div
                  key={document.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-[#E6E9E4] p-4 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E5EEE8] text-[#123B32]">
                      <FileText size={21} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-[#123B32]">
                        {typeLabel}
                      </h3>

                      <p className="mt-1 break-all text-xs text-[#68736D]">
                        {document.fileName}
                      </p>

                      <p className="mt-1 text-xs text-[#68736D]">
                        {formatFileSize(document.fileSize)}
                        {" · "}
                        Uploaded {formatDate(document.createdAt)}
                      </p>

                      {document.reviewReason && (
                        <p className="mt-2 rounded-lg bg-orange-50 p-2 text-xs text-orange-800">
                          Review note: {document.reviewReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${documentStatusStyles[document.reviewStatus] ||
                        "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {(document.reviewStatus || "PENDING").replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDownload(document)}
                      disabled={downloadingId === document.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#DCE3DC] px-3 py-2 text-xs font-semibold text-[#123B32] hover:bg-[#F5F8F5] disabled:opacity-50"
                    >
                      <Download size={15} />
                      {downloadingId === document.id
                        ? "Downloading..."
                        : "Download"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


export default function NGOSectionPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const section = sections[location.pathname];

  const isProfilePage = location.pathname === "/ngo/profile";
  const isDocumentsPage = location.pathname === "/ngo/documents";
  const isCausesPage = location.pathname === "/ngo/causes";
  const isInitiativesPage = location.pathname === "/ngo/initiatives";
  const isDonationsPage = location.pathname === "/ngo/donations";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [galleryInput, setGalleryInput] = useState("");

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ngo-profile"],
    queryFn: fetchProfile,
    enabled: isProfilePage,
  });

  useEffect(() => {
    if (!profile) return;

    setForm({
      organizationName: profile.organizationName || "",
      legalName: profile.legalName || "",
      registrationNumber: profile.registrationNumber || "",
      description: profile.description || "",
      mission: profile.mission || "",
      vision: profile.vision || "",
      website: profile.website || "",
      phone: profile.phone || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      country: profile.country || "India",
      minimumDonation: profile.minimumDonation ?? "",
      logoUrl: profile.logoUrl || "",
      galleryUrls: profile.galleryUrls || [],
    });
  }, [profile]);

  if (!section) return null;

  const Icon = section.icon;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const addGalleryImage = () => {
    const url = galleryInput.trim();

    if (!url) return;

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid image URL.");
      return;
    }

    if (form.galleryUrls.includes(url)) {
      toast.error("This image URL is already added.");
      return;
    }

    if (form.galleryUrls.length >= 10) {
      toast.error("You can add up to 10 gallery images.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      galleryUrls: [...previous.galleryUrls, url],
    }));

    setGalleryInput("");
  };

  const removeGalleryImage = (url) => {
    setForm((previous) => ({
      ...previous,
      galleryUrls: previous.galleryUrls.filter((item) => item !== url),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.organizationName.trim() || !form.country.trim()) {
      toast.error("Organization name and country are required.");
      return;
    }

    const minimumDonation =
      form.minimumDonation === "" ? null : Number(form.minimumDonation);

    if (
      minimumDonation !== null &&
      (!Number.isFinite(minimumDonation) || minimumDonation <= 0)
    ) {
      toast.error("Minimum donation must be a positive amount.");
      return;
    }

    const payload = {
      ...form,
      organizationName: form.organizationName.trim(),
      country: form.country.trim(),
      minimumDonation,
    };

    setSaving(true);

    try {
      const response = await fetch("/api/ngo/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update profile.");
      }

      await queryClient.invalidateQueries({
        queryKey: ["ngo-profile"],
      });

      toast.success("Organization profile updated successfully.");
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#B18A43]">NGO WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-bold text-[#123B32]">
          {section.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68736D]">
          {section.description}
        </p>
      </div>

      {!isProfilePage ? (
        isDocumentsPage ? (
          <DocumentsSection />
        ) : isCausesPage ? (
          <NGOCausesSection />
        ) : isInitiativesPage ? (
          <NGOInitiativesSection />
        ) : isDonationsPage ? (
          <NGODonationsSection />
        ) : (
          <div className="rounded-2xl border border-[#E6E9E4] bg-white p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EEE8] text-[#123B32]">
              <Icon size={27} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-[#123B32]">
              This section is being implemented
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#68736D]">
              Your organization profile and document management are now
              connected. Other portal modules will be implemented next.
            </p>
          </div>
        )
      ) : isLoading ? (
        <div className="rounded-2xl border border-[#E6E9E4] bg-white p-8 text-sm text-[#68736D]">
          Loading organization profile...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8">
          <p className="text-sm text-red-700">
            {error.message || "Unable to load profile."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#123B32] px-4 py-2 text-sm font-medium text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E9E4] bg-white p-5">
            <div>
              <p className="text-sm text-[#68736D]">Verification status</p>
              <p className="mt-1 text-sm text-[#34483F]">
                This status is managed by the SevaSphere verification team.
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${statusStyles[profile.status] || statusStyles.PENDING
                }`}
            >
              {(profile.status || "PENDING").replaceAll("_", " ")}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-[#123B32]">
                Organization details
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Organization name *"
                  name="organizationName"
                  value={form.organizationName}
                  onChange={handleChange}
                />
                <Field
                  label="Legal name"
                  name="legalName"
                  value={form.legalName}
                  onChange={handleChange}
                />
                <Field
                  label="Registration number"
                  name="registrationNumber"
                  value={form.registrationNumber}
                  onChange={handleChange}
                />
                <Field
                  label="Website"
                  name="website"
                  type="url"
                  value={form.website}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Organization description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-[#123B32]">
                Mission and vision
              </h2>
              <div className="space-y-5">
                <TextAreaField
                  label="Mission"
                  name="mission"
                  value={form.mission}
                  onChange={handleChange}
                />
                <TextAreaField
                  label="Vision"
                  name="vision"
                  value={form.vision}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-[#123B32]">
                Contact and location
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
                <Field
                  label="Country *"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                />
                <Field
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
                <Field
                  label="State"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-[#123B32]">
                Donation preferences
              </h2>
              <div className="max-w-md">
                <Field
                  label="Minimum donation (₹)"
                  name="minimumDonation"
                  type="number"
                  value={form.minimumDonation}
                  onChange={handleChange}
                  placeholder="e.g. 100"
                />
              </div>
              <p className="mt-2 text-xs text-[#68736D]">
                Leave empty if your organization has no minimum donation.
              </p>
            </section>

            <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-[#123B32]">
                Organization images
              </h2>

              <Field
                label="Logo image URL"
                name="logoUrl"
                type="url"
                value={form.logoUrl}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
              />

              {form.logoUrl && (
                <div className="mt-4">
                  <img
                    src={form.logoUrl}
                    alt="Organization logo preview"
                    className="h-24 w-24 rounded-xl border border-[#E6E9E4] object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  Gallery image URLs (maximum 10)
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="url"
                    value={galleryInput}
                    onChange={(event) => setGalleryInput(event.target.value)}
                    placeholder="https://example.com/image.png"
                    className="min-w-0 flex-1 rounded-xl border border-[#DCE3DC] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                  />
                  <button
                    type="button"
                    onClick={addGalleryImage}
                    className="rounded-xl border border-[#123B32] px-5 py-3 text-sm font-semibold text-[#123B32]"
                  >
                    Add image
                  </button>
                </div>

                {form.galleryUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {form.galleryUrls.map((url) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt="Organization gallery"
                          className="h-28 w-full rounded-xl border border-[#E6E9E4] object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(url)}
                          className="mt-2 text-xs font-medium text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#123B32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1B5144] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
