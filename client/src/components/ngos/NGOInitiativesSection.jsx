
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, CalendarDays, Target } from "lucide-react";

const initialForm = {
  title: "",
  description: "",
  causeId: "",
  targetAmount: "",
  startDate: "",
  endDate: "",
  status: "DRAFT",
};

const formatDate = (date) =>
  date ? new Date(date).toISOString().split("T")[0] : "";

const formatAmount = (amount) =>
  amount == null
    ? "Not specified"
    : `₹${Number(amount).toLocaleString("en-IN")}`;

const statusStyles = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function NGOInitiativesSection() {
  const [initiatives, setInitiatives] = useState([]);
  const [causes, setCauses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [initiativeResponse, causeResponse] = await Promise.all([
        fetch("/api/ngo/initiatives", { credentials: "include" }),
        fetch("/api/ngo/causes", { credentials: "include" }),
      ]);

      const [initiativeResult, causeResult] = await Promise.all([
        initiativeResponse.json(),
        causeResponse.json(),
      ]);

      if (!initiativeResponse.ok || !initiativeResult.success) {
        throw new Error(
          initiativeResult.message || "Unable to load initiatives."
        );
      }

      if (!causeResponse.ok || !causeResult.success) {
        throw new Error(causeResult.message || "Unable to load causes.");
      }

      setInitiatives(initiativeResult.data);
      setCauses(
        causeResult.data.causes.filter((cause) => cause.selected)
      );
    } catch (err) {
      setError(err.message || "Unable to load initiatives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openCreateForm = () => {
    setForm({
      ...initialForm,
      causeId: causes[0]?.id || "",
    });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (initiative) => {
    setForm({
      title: initiative.title,
      description: initiative.description,
      causeId: initiative.causeId,
      targetAmount: initiative.targetAmount ?? "",
      startDate: formatDate(initiative.startDate),
      endDate: formatDate(initiative.endDate),
      status: initiative.status,
    });
    setEditingId(initiative.id);
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount:
          form.targetAmount === "" ? null : Number(form.targetAmount),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      const url = editingId
        ? `/api/ngo/initiatives/${editingId}`
        : "/api/ngo/initiatives";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save initiative.");
      }

      await loadData();
      closeForm();
    } catch (err) {
      setError(err.message || "Unable to save initiative.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (initiative) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${initiative.title}"?`
    );

    if (!confirmed) return;

    setDeletingId(initiative.id);
    setError("");

    try {
      const response = await fetch(
        `/api/ngo/initiatives/${initiative.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete initiative.");
      }

      setInitiatives((previous) =>
        previous.filter((item) => item.id !== initiative.id)
      );
    } catch (err) {
      setError(err.message || "Unable to delete initiative.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#123B32]">
              Your initiatives
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#68736D]">
              Create and manage the projects your organization is working on.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={causes.length === 0 || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#123B32] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1B5144] disabled:opacity-50"
          >
            <Plus size={17} />
            Add initiative
          </button>
        </div>

        {error && (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-[#68736D]">
            Loading initiatives...
          </p>
        ) : causes.length === 0 ? (
          <div className="mt-6 rounded-xl bg-[#F7F8F5] p-6">
            <p className="font-semibold text-[#123B32]">
              Select causes first
            </p>
            <p className="mt-2 text-sm text-[#68736D]">
              You need to select at least one cause before creating an
              initiative.
            </p>
          </div>
        ) : initiatives.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-[#C9D5CC] p-10 text-center">
            <Target className="mx-auto text-[#789184]" size={32} />
            <h3 className="mt-3 font-semibold text-[#123B32]">
              No initiatives yet
            </h3>
            <p className="mt-2 text-sm text-[#68736D]">
              Start by creating your organization's first initiative.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {initiatives.map((initiative) => (
              <article
                key={initiative.id}
                className="rounded-xl border border-[#E6E9E4] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#123B32]">
                      {initiative.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#B18A43]">
                      {initiative.cause?.name || "Cause"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusStyles[initiative.status] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {initiative.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#68736D]">
                  {initiative.description}
                </p>

                <div className="mt-5 grid gap-3 border-t border-[#E6E9E4] pt-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-[#34483F]">
                    <Target size={16} />
                    {formatAmount(initiative.targetAmount)}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[#34483F]">
                    <CalendarDays size={16} />
                    {initiative.startDate
                      ? formatDate(initiative.startDate)
                      : "No start date"}
                  </div>

                  <p className="text-xs text-[#68736D] sm:col-span-2">
                    End date:{" "}
                    {initiative.endDate
                      ? formatDate(initiative.endDate)
                      : "Not specified"}
                  </p>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(initiative)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#D8E0D9] px-4 py-2 text-sm font-medium text-[#123B32] hover:bg-[#F1F6F2]"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(initiative)}
                    disabled={deletingId === initiative.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    {deletingId === initiative.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#123B32]">
              {editingId ? "Edit initiative" : "Create initiative"}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-[#68736D] hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#34483F]">
                Initiative title
              </label>
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                required
                minLength={3}
                maxLength={150}
                placeholder="e.g. Community Education Drive"
                className="w-full rounded-xl border border-[#D8E0D9] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#34483F]">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                placeholder="Describe the initiative and its goals..."
                className="w-full rounded-xl border border-[#D8E0D9] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  Associated cause
                </label>
                <select
                  name="causeId"
                  value={form.causeId}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-[#D8E0D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                >
                  <option value="">Select a cause</option>
                  {causes.map((cause) => (
                    <option key={cause.id} value={cause.id}>
                      {cause.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  Target amount (₹)
                </label>
                <input
                  type="number"
                  name="targetAmount"
                  value={form.targetAmount}
                  onChange={updateField}
                  min="0.01"
                  max="100000000"
                  step="0.01"
                  placeholder="50000"
                  className="w-full rounded-xl border border-[#D8E0D9] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  Start date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={updateField}
                  className="w-full rounded-xl border border-[#D8E0D9] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  End date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={updateField}
                  className="w-full rounded-xl border border-[#D8E0D9] px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#34483F]">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className="w-full rounded-xl border border-[#D8E0D9] bg-white px-4 py-3 text-sm outline-none focus:border-[#123B32]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#E6E9E4] pt-5">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-[#D8E0D9] px-5 py-3 text-sm font-semibold text-[#34483F]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#123B32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1B5144] disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update initiative"
                    : "Create initiative"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
