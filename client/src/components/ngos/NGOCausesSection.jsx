import { useEffect, useState } from "react";

const fetchCauses = async () => {
  const response = await fetch("/api/ngo/causes", {
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load causes.");
  }

  return result.data;
};

export default function NGOCausesSection() {
  const [causes, setCauses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCauses = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchCauses();
      setCauses(data.causes);
      setSelectedIds(data.selectedCauseIds);
    } catch (err) {
      setError(err.message || "Unable to load causes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCauses();
  }, []);

  const toggleCause = (causeId) => {
    setSuccess("");

    setSelectedIds((previous) =>
      previous.includes(causeId)
        ? previous.filter((id) => id !== causeId)
        : [...previous, causeId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/ngo/causes", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          causeIds: selectedIds,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save causes.");
      }

      const savedIds = result.data.map((cause) => cause.id);

      setSelectedIds(savedIds);
      setCauses((previous) =>
        previous.map((cause) => ({
          ...cause,
          selected: savedIds.includes(cause.id),
        }))
      );

      setSuccess("Your causes have been saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save causes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E6E9E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#123B32]">
              Causes supported by your organization
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68736D]">
              Select the causes your NGO actively works towards.
              These selections help donors discover your organization.
            </p>
          </div>

          <span className="rounded-full bg-[#E5EEE8] px-4 py-2 text-sm font-semibold text-[#123B32]">
            {selectedIds.length} selected
          </span>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-[#68736D]">
            Loading available causes...
          </p>
        ) : error && causes.length === 0 ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={loadCauses}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {causes.map((cause) => {
                const selected = selectedIds.includes(cause.id);

                return (
                  <label
                    key={cause.id}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 transition ${
                      selected
                        ? "border-[#123B32] bg-[#F1F6F2]"
                        : "border-[#E6E9E4] bg-white hover:border-[#AABDB0]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCause(cause.id)}
                      className="mt-1 h-4 w-4 accent-[#123B32]"
                    />

                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#123B32]">
                        {cause.name}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#68736D]">
                        {cause.description || "No description available."}
                      </p>

                      {selected && (
                        <span className="mt-3 inline-block text-xs font-semibold text-[#23634D]">
                          Selected
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {causes.length === 0 && (
              <p className="mt-6 text-sm text-[#68736D]">
                No active causes are currently available.
              </p>
            )}

            {error && (
              <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">
                {success}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E9E4] pt-5">
              <p className="text-xs text-[#68736D]">
                You can update your selections at any time.
              </p>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="rounded-xl bg-[#123B32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1B5144] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save selected causes"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}