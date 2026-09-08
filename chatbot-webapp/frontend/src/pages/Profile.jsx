import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Camera, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photo: user?.photo || "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, photo: reader.result }));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const { data } = await api.put("/profile", form);
      updateProfile(data.user);
      setStatus({ type: "success", message: "Your changes have been saved." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "We couldn't save your changes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-paper px-4 py-6 font-sans sm:py-10">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl2 border border-line bg-white shadow-soft">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Link
            to="/chat"
            className="rounded-full p-2 text-muted transition-colors hover:bg-sand hover:text-ink"
            aria-label="Back to chat"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-display text-lg text-ink">My Profile</h1>
        </header>

        <div className="grid gap-8 px-5 py-6 sm:grid-cols-[auto,1fr] sm:px-8 sm:py-8">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-teal-tint">
              {form.photo ? (
                <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-teal">
                  <UserRound size={32} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-sand"
            >
              <Camera size={13} />
              Change photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoPick} className="hidden" />
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <Field label="Name" value={form.name} onChange={handleChange("name")} />
            <Field label="Email" type="email" value={form.email} onChange={handleChange("email")} />
            <Field label="Phone" value={form.phone} onChange={handleChange("phone")} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">ID</label>
              <input
                readOnly
                value={user?.id || ""}
                className="w-full cursor-not-allowed rounded-lg border border-line bg-sand/60 px-3.5 py-2.5 text-sm text-muted"
              />
            </div>

            {status && (
              <p
                className={`text-sm ${status.type === "success" ? "text-teal-dark" : "text-[#B65C4A]"}`}
                role="status"
              >
                {status.message}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-teal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-line bg-paper/40 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal focus:bg-white"
      />
    </div>
  );
}
