import { useState, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  "All relevant GitHub pull requests have been merged",
  "CHANGELOG has been updated",
  "Unit tests passing",
  "Release branch is created",
  "Deployed to staging & demo",
  "Tested thoroughly in the browser",
  "Deployment manifest updated",
  "Production deployment done",
  "Post-release monitoring active",
];

const STATUS_META = {
  planned:  { label: "Planned",  color: "#6b7280" },
  ongoing:  { label: "Ongoing",  color: "#f59e0b" },
  done:     { label: "Done",     color: "#10b981" },
};

function computeStatus(completedSteps = []) {
  if (completedSteps.length === 0) return "planned";
  if (completedSteps.length === STEPS.length) return "done";
  return "ongoing";
}

// ── Local "DB" via localStorage ──────────────────────────────────────────────
const DB_KEY = "releasecheck_releases";

function loadReleases() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
  catch { return []; }
}
function saveReleases(releases) {
  localStorage.setItem(DB_KEY, JSON.stringify(releases));
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Styles ───────────────────────────────────────────────────────────────────
const css = {
  root: { fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#f9fafb", color: "#111827" },
  header: { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 2rem", display: "flex", alignItems: "center", height: 56 },
  logo: { fontWeight: 700, fontSize: 18, color: "#4f46e5", letterSpacing: "-0.5px" },
  sub: { fontSize: 12, color: "#9ca3af", marginLeft: 8 },
  main: { maxWidth: 860, margin: "0 auto", padding: "2rem 1rem" },
  // List
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
  btnPrimary: { background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  btnDanger: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" },
  btnSecondary: { background: "none", border: "1px solid #d1d5db", color: "#374151", borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  td: { padding: "12px 14px", fontSize: 14, borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  badge: (status) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: STATUS_META[status].color + "22", color: STATUS_META[status].color }),
  link: { color: "#4f46e5", textDecoration: "none", fontWeight: 500, cursor: "pointer", fontSize: 13 },
  // Detail
  breadcrumb: { fontSize: 14, color: "#6b7280", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 },
  card: { background: "#fff", borderRadius: 8, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,.08)", marginBottom: 20 },
  metaRow: { display: "flex", gap: 32, marginBottom: 4 },
  metaLabel: { fontSize: 12, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: 600 },
  progress: { height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 12 },
  progressBar: (pct) => ({ height: "100%", width: pct + "%", background: pct === 100 ? "#10b981" : "#4f46e5", borderRadius: 999, transition: "width .3s" }),
  stepList: { listStyle: "none", padding: 0, margin: 0 },
  stepItem: (checked) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", userSelect: "none" }),
  checkbox: (checked) => ({ width: 18, height: 18, borderRadius: 4, border: checked ? "none" : "2px solid #d1d5db", background: checked ? "#4f46e5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s" }),
  stepLabel: (checked) => ({ fontSize: 14, color: checked ? "#6b7280" : "#111827", textDecoration: checked ? "line-through" : "none" }),
  textarea: { width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 14, resize: "vertical", minHeight: 80, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  saveRow: { display: "flex", justifyContent: "flex-end", marginTop: 10 },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 10, padding: "2rem", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  modalTitle: { fontWeight: 700, fontSize: 18, marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" },
  formGroup: { marginBottom: 16 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  empty: { textAlign: "center", color: "#9ca3af", padding: "3rem 0", fontSize: 15 },
};

// ── Components ────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return <span style={css.badge(status)}>{STATUS_META[status].label}</span>;
}

function Checkbox({ checked }) {
  return (
    <div style={css.checkbox(checked)}>
      {checked && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  );
}

function NewReleaseModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!date) { setErr("Date is required."); return; }
    onCreate({ id: genId(), name: name.trim(), date, info, completedSteps: [] });
    onClose();
  };

  return (
    <div style={css.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={css.modal}>
        <div style={css.modalTitle}>New Release</div>
        <div style={css.formGroup}>
          <label style={css.label}>Release Name *</label>
          <input style={css.input} placeholder="e.g. Version 2.0" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={css.formGroup}>
          <label style={css.label}>Due Date *</label>
          <input type="datetime-local" style={css.input} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={css.formGroup}>
          <label style={css.label}>Additional Info</label>
          <textarea style={{ ...css.textarea, minHeight: 60 }} placeholder="Optional notes…" value={info} onChange={e => setInfo(e.target.value)} />
        </div>
        {err && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <div style={css.modalFooter}>
          <button style={css.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={css.btnPrimary} onClick={submit}>Create Release</button>
        </div>
      </div>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────
function ListView({ releases, onView, onCreate, onDelete }) {
  const [showModal, setShowModal] = useState(false);

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };

  return (
    <div>
      <div style={css.topBar}>
        <h1 style={css.pageTitle}>All Releases</h1>
        <button style={css.btnPrimary} onClick={() => setShowModal(true)}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Release
        </button>
      </div>
      {releases.length === 0
        ? <div style={css.empty}>No releases yet. Create your first one!</div>
        : (
          <table style={css.table}>
            <thead>
              <tr>
                <th style={css.th}>Release</th>
                <th style={css.th}>Date</th>
                <th style={css.th}>Status</th>
                <th style={css.th}>Progress</th>
                <th style={css.th}></th>
              </tr>
            </thead>
            <tbody>
              {releases.map(r => {
                const status = computeStatus(r.completedSteps);
                const pct = Math.round((r.completedSteps.length / STEPS.length) * 100);
                return (
                  <tr key={r.id} style={{ transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={css.td}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                    </td>
                    <td style={{ ...css.td, color: "#6b7280" }}>{fmtDate(r.date)}</td>
                    <td style={css.td}><StatusBadge status={status} /></td>
                    <td style={{ ...css.td, minWidth: 100 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 3 }}>{r.completedSteps.length}/{STEPS.length}</div>
                      <div style={{ height: 5, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", width: 80 }}>
                        <div style={{ height: "100%", width: pct + "%", background: pct === 100 ? "#10b981" : "#4f46e5", borderRadius: 999 }} />
                      </div>
                    </td>
                    <td style={{ ...css.td, whiteSpace: "nowrap" }}>
                      <button style={css.link} onClick={() => onView(r.id)}>View →</button>
                      <button style={{ ...css.btnDanger, marginLeft: 8 }} onClick={() => onDelete(r.id)} title="Delete">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      {showModal && <NewReleaseModal onClose={() => setShowModal(false)} onCreate={onCreate} />}
    </div>
  );
}

function DetailView({ release, onBack, onToggleStep, onSaveInfo }) {
  const [info, setInfo] = useState(release.info || "");
  const [saved, setSaved] = useState(false);
  const status = computeStatus(release.completedSteps);
  const pct = Math.round((release.completedSteps.length / STEPS.length) * 100);

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return d; }
  };

  const handleSave = () => {
    onSaveInfo(release.id, info);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      <div style={css.breadcrumb}>
        <span style={{ ...css.link, fontWeight: 400 }} onClick={onBack}>All releases</span>
        <span>›</span>
        <span style={{ color: "#374151", fontWeight: 600 }}>{release.name}</span>
      </div>

      {/* Meta card */}
      <div style={css.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={css.metaRow}>
            <div>
              <div style={css.metaLabel}>Release</div>
              <div style={css.metaValue}>{release.name}</div>
            </div>
            <div>
              <div style={css.metaLabel}>Due Date</div>
              <div style={css.metaValue}>{fmtDate(release.date)}</div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <div style={css.progress}>
          <div style={css.progressBar(pct)} />
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{release.completedSteps.length} of {STEPS.length} steps completed ({pct}%)</div>
      </div>

      {/* Steps card */}
      <div style={css.card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Checklist</div>
        <ul style={css.stepList}>
          {STEPS.map((step, i) => {
            const checked = release.completedSteps.includes(i);
            return (
              <li key={i} style={css.stepItem(checked)} onClick={() => onToggleStep(release.id, i)}>
                <Checkbox checked={checked} />
                <span style={css.stepLabel(checked)}>{step}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Notes card */}
      <div style={css.card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Additional Notes / Info</div>
        <textarea
          style={css.textarea}
          placeholder="Add any release notes, context, or links here…"
          value={info}
          onChange={e => setInfo(e.target.value)}
        />
        <div style={css.saveRow}>
          <button style={{ ...css.btnPrimary, background: saved ? "#10b981" : "#4f46e5" }} onClick={handleSave}>
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [releases, setReleases] = useState(loadReleases);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => { saveReleases(releases); }, [releases]);

  const activeRelease = releases.find(r => r.id === activeId);

  const handleCreate = useCallback((r) => {
    setReleases(prev => [r, ...prev]);
  }, []);

  const handleDelete = useCallback((id) => {
    if (confirm("Delete this release?")) {
      setReleases(prev => prev.filter(r => r.id !== id));
      if (activeId === id) setActiveId(null);
    }
  }, [activeId]);

  const handleToggleStep = useCallback((id, stepIndex) => {
    setReleases(prev => prev.map(r => {
      if (r.id !== id) return r;
      const has = r.completedSteps.includes(stepIndex);
      return { ...r, completedSteps: has ? r.completedSteps.filter(i => i !== stepIndex) : [...r.completedSteps, stepIndex] };
    }));
  }, []);

  const handleSaveInfo = useCallback((id, info) => {
    setReleases(prev => prev.map(r => r.id === id ? { ...r, info } : r));
  }, []);

  return (
    <div style={css.root}>
      <header style={css.header}>
        <span style={css.logo} onClick={() => setActiveId(null)}>ReleaseCheck</span>
        <span style={css.sub}>Your all-in-one release checklist tool</span>
      </header>
      <main style={css.main}>
        {!activeRelease
          ? <ListView releases={releases} onView={setActiveId} onCreate={handleCreate} onDelete={handleDelete} />
          : <DetailView release={activeRelease} onBack={() => setActiveId(null)} onToggleStep={handleToggleStep} onSaveInfo={handleSaveInfo} />
        }
      </main>
    </div>
  );
}
