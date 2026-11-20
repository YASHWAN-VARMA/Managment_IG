import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import {
  ShieldCheck, Monitor, UserCircle, Users, Plus, Pencil,
  KeyRound, Power, LogOut, X, RefreshCw
} from "lucide-react";
import "./UserManagement.css";

const blankForm = { name: "", email: "", phone: "", password: "" };

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "Admin";
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setError("");
    try {
      const data = await api.get("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Unable to load user accounts.");
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function openCreate() {
    setForm(blankForm);
    setModal({ type: "create" });
    setError("");
  }

  function openEdit(account) {
    setForm({ name: account.name || "", email: account.email || "", phone: account.phone || "", password: "" });
    setModal({ type: "edit", account });
    setError("");
  }

  function openPassword(account) {
    setForm({ ...blankForm, password: "" });
    setModal({ type: "password", account });
    setError("");
  }

  async function submitUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (modal.type === "create") {
        await api.post("/admin/users", form);
        setNotice("Manager account created successfully.");
      } else if (modal.type === "edit") {
        await api.put(`/admin/users/${modal.account.id || modal.account._id}`, {
          name: form.name, email: form.email, phone: form.phone
        });
        setNotice("User details updated.");
      } else {
        await api.post(`/admin/users/${modal.account.id || modal.account._id}/reset-password`, {
          password: form.password
        });
        setNotice("Password reset and existing sessions revoked.");
      }
      setModal(null);
      await loadUsers();
    } catch (err) {
      setError(err.message || "The operation could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(account) {
    const next = account.isActive === false;
    const action = next ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${account.name}? ${next ? "" : "Their active sessions will also be revoked."}`)) return;
    setError("");
    setNotice("");
    try {
      await api.patch(`/admin/users/${account.id || account._id}/status`, { isActive: next });
      setNotice(next ? "User activated." : "User deactivated and sessions revoked.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to change account status.");
    }
  }

  async function revokeSessions(account) {
    if (!window.confirm(`Revoke all active sessions for ${account.name}? They will need to sign in again.`)) return;
    setError("");
    setNotice("");
    try {
      await api.post(`/admin/users/${account.id || account._id}/revoke-sessions`, {});
      setNotice(`All sessions for ${account.name} were revoked.`);
    } catch (err) {
      setError(err.message || "Unable to revoke sessions.");
    }
  }

  return <>
    <PageHeader title="Settings" description="Manage your account, application preferences and authorised users." />
    <div className="settings-grid">
      <section className="panel settings-section">
        <div className="settings-title"><UserCircle /><div><h2>Account</h2><p>Signed-in user information</p></div></div>
        <div className="detail-list">
          <div><span>Name</span><strong>{user?.name || "—"}</strong></div>
          <div><span>Email</span><strong>{user?.email || "—"}</strong></div>
          <div><span>Role</span><strong>{user?.role || "—"}</strong></div>
        </div>
      </section>
      <section className="panel settings-section">
        <div className="settings-title"><Monitor /><div><h2>Appearance</h2><p>Current interface configuration</p></div></div>
        <div className="detail-list">
          <div><span>Theme</span><strong>Dark charcoal</strong></div>
          <div><span>Accent</span><strong>Monochrome</strong></div>
          <div><span>Typography</span><strong>Inter</strong></div>
        </div>
      </section>
      <section className="panel settings-section">
        <div className="settings-title"><ShieldCheck /><div><h2>Access</h2><p>Role-based access is enforced by the backend</p></div></div>
        <p className="settings-note">Only Admin accounts can create and manage users. Managers cannot grant access, change roles or manage other accounts.</p>
      </section>
    </div>

    {isAdmin && <section className="panel user-management-panel">
      <div className="user-management-heading">
        <div className="settings-title"><Users /><div><h2>User Management</h2><p>Create accounts and manage access to Managment_IG.</p></div></div>
        <div className="user-management-actions">
          <button className="button button-secondary" onClick={loadUsers} disabled={loadingUsers}><RefreshCw size={15}/> Refresh</button>
          <button className="button button-primary" onClick={openCreate}><Plus size={16}/> Create user</button>
        </div>
      </div>
      {notice && <div className="user-notice">{notice}</div>}
      {error && !modal && <div className="notice notice-error">{error}</div>}
      {loadingUsers ? <div className="table-loading">Loading user accounts...</div> : users.length === 0 ? (
        <div className="empty-state"><Users size={25}/><strong>No user accounts found</strong><span>Create a Manager account to give someone access.</span></div>
      ) : <div className="table-wrap">
        <table className="user-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{users.map((account) => {
            const isCurrent = String(account.id || account._id) === String(user?.id || user?._id);
            const isAdminAccount = account.role === "Admin";
            return <tr key={account.id || account._id}>
              <td className="cell-strong">{account.role === "Manager" ? (
                <button type="button" className="manager-name-link" onClick={() => navigate(`/managers/${account.id || account._id}`)}>
                  {account.name}
                </button>
              ) : account.name}{isCurrent ? " (You)" : ""}</td>
              <td>{account.email}</td>
              <td>{account.phone || "—"}</td>
              <td>{account.role}</td>
              <td><span className={`user-state ${account.isActive === false ? "inactive" : "active"}`}>{account.isActive === false ? "Inactive" : "Active"}</span></td>
              <td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString("en-IN") : "—"}</td>
              <td><div className="row-actions">
                {!isAdminAccount && <>
                  <button className="icon-button" title="Edit user" aria-label="Edit user" onClick={() => openEdit(account)}><Pencil size={16}/></button>
                  <button className="icon-button" title="Reset password" aria-label="Reset password" onClick={() => openPassword(account)}><KeyRound size={16}/></button>
                  <button className="icon-button" title="Revoke sessions" aria-label="Revoke sessions" onClick={() => revokeSessions(account)}><LogOut size={16}/></button>
                  <button className="icon-button" title={account.isActive === false ? "Activate user" : "Deactivate user"} aria-label={account.isActive === false ? "Activate user" : "Deactivate user"} onClick={() => toggleStatus(account)}><Power size={16}/></button>
                </>}
                {isAdminAccount && <span className="admin-protected-label">Protected</span>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <p className="user-management-footnote">New accounts are created as Managers. Admin privileges cannot be granted from this screen. Temporary passwords should be shared with users through a private channel.</p>
    </section>}

    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setModal(null); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        <div className="modal-header">
          <div><h2 id="user-modal-title">{modal.type === "create" ? "Create Manager account" : modal.type === "edit" ? "Edit user" : "Reset password"}</h2><p>{modal.type === "create" ? "Create a new account with Manager permissions." : modal.type === "edit" ? "Update the user's contact details." : `Set a new temporary password for ${modal.account.name}.`}</p></div>
          <button className="icon-button" onClick={() => setModal(null)} disabled={busy} aria-label="Close"><X size={18}/></button>
        </div>
        <div className="modal-content">
          <form className="form-stack" onSubmit={submitUser}>
            {modal.type !== "password" ? <>
              <label>Full name<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter full name"/></label>
              <label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com"/></label>
              <label>Mobile number<input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX"/></label>
              {modal.type === "create" && <label>Temporary password<input required type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 12 characters"/></label>}
            </> : <label>New temporary password<input required type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 12 characters"/></label>}
            {error && <div className="notice notice-error">{error}</div>}
            {modal.type === "create" && <p className="user-form-help">The account will be active immediately and will have Manager permissions. Share the temporary password privately.</p>}
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving..." : modal.type === "create" ? "Create account" : modal.type === "edit" ? "Save changes" : "Reset password"}</button></div>
          </form>
        </div>
      </section>
    </div>}
  </>;
}
