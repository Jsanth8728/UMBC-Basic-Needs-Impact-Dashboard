import { useEffect, useRef, useState } from "react";
import "./UserManagementPage.css";

const roles = ["admin", "staff", "dean"];
const approvals = ["pending", "approved", "rejected"];
const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1);
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const blankUser = { id: "", firstName: "", lastName: "", email: "", role: "staff", department: "", approval: "pending", expires: "" };

function UserEditor({ user, users, currentUserId, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(user || blankUser);
  const [error, setError] = useState("");
  const isSelf = user?.id === currentUserId;
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function update(event) {
    setDraft(previous => ({ ...previous, [event.target.name]: event.target.value }));
    setError("");
  }
  function submit(event) {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]));
    if (![next.id, next.firstName, next.lastName, next.email, next.expires].every(Boolean)) {
      setError("Complete all required fields.");
      return;
    }
    if (!user && users.some(item => item.id.toLowerCase() === next.id.toLowerCase())) {
      setError("That campus ID is already in use.");
      return;
    }
    if (users.some(item => item.id !== user?.id && item.email.toLowerCase() === next.email.toLowerCase())) {
      setError("That email address is already in use.");
      return;
    }
    onSave(next);
  }
  return <dialog className="user-editor" ref={dialogRef} aria-labelledby="user-editor-title" onCancel={onClose}>
    <form onSubmit={submit}>
      <div className="user-editor-heading"><h2 id="user-editor-title">{user ? "Edit user" : "Add user"}</h2><button type="button" className="user-close" aria-label="Close user form" onClick={onClose}>×</button></div>
      <div className="user-form-grid">
        <label>Campus ID<input autoFocus name="id" value={draft.id} onChange={update} maxLength={30} readOnly={Boolean(user)} required /></label>
        <label>Role<select name="role" value={draft.role} onChange={update} disabled={isSelf}>{roles.map(role => <option key={role} value={role}>{titleCase(role)}</option>)}</select></label>
        <label>First name<input name="firstName" value={draft.firstName} onChange={update} maxLength={100} required /></label>
        <label>Last name<input name="lastName" value={draft.lastName} onChange={update} maxLength={100} required /></label>
        <label className="user-form-wide">Email address<input name="email" type="email" value={draft.email} onChange={update} maxLength={255} required /></label>
        <label className="user-form-wide">Department <span className="user-optional">(optional)</span><input name="department" value={draft.department} onChange={update} maxLength={150} /></label>
        <label>Approval<select name="approval" value={draft.approval} onChange={update} disabled={isSelf}>{approvals.map(status => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
        <label>Expiration date<input name="expires" type="date" value={draft.expires} onChange={update} required /></label>
      </div>
      {error && <p className="user-form-error" role="alert">{error}</p>}
      <div className="user-editor-actions"><button type="button" className="user-button" onClick={onClose}>Cancel</button><button className="user-button user-button-gold" type="submit">{user ? "Save changes" : "Add user"}</button></div>
    </form>
  </dialog>;
}

export default function UserManagementPage({ users, onUsersChange, currentUserId }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [approval, setApproval] = useState("all");
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState("");
  const search = query.trim().toLowerCase();
  const filtered = users.filter(user => (role === "all" || user.role === role) && (approval === "all" || user.approval === approval) &&
    [user.id, `${user.firstName} ${user.lastName}`, user.email, user.department].some(value => value.toLowerCase().includes(search)));
  const filteredOut = query || role !== "all" || approval !== "all";
  function reset() { setQuery(""); setRole("all"); setApproval("all"); }
  function save(user) {
    onUsersChange(previous => editor.user ? previous.map(item => item.id === user.id ? user : item) : [...previous, user]);
    setMessage(`${user.firstName} ${user.lastName} ${editor.user ? "updated" : "added"} for this session.`);
    setEditor(null);
  }
  function approve(user) {
    onUsersChange(previous => previous.map(item => item.id === user.id ? { ...item, approval: "approved" } : item));
    setMessage(`${user.firstName} ${user.lastName} approved for this session.`);
  }
  return <div className="user-management">
    <div className="user-page-heading"><h1>User Management</h1><button type="button" className="user-button user-button-gold" onClick={() => setEditor({ user: null })}><span aria-hidden="true">＋</span> Add user</button></div>
    <div className="user-summary" aria-label="User counts">
      <div><span>Total users</span><strong>{users.length}</strong></div>
      <div><span>Pending approval</span><strong>{users.filter(user => user.approval === "pending").length}</strong></div>
      <div><span>Administrators</span><strong>{users.filter(user => user.role === "admin").length}</strong></div>
    </div>
    <section className="user-directory" aria-labelledby="user-directory-title">
      <div className="user-directory-heading"><h2 id="user-directory-title">Users</h2><span>{filtered.length} of {users.length}</span></div>
      <div className="user-filters">
        <label className="user-search">Search users<input type="search" placeholder="Name, campus ID, email, or department" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label>Role<select value={role} onChange={event => setRole(event.target.value)}><option value="all">All roles</option>{roles.map(item => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label>
        <label>Approval<select value={approval} onChange={event => setApproval(event.target.value)}><option value="all">All statuses</option>{approvals.map(item => <option key={item} value={item}>{titleCase(item)}</option>)}</select></label>
        <button type="button" className="user-reset" onClick={reset} disabled={!filteredOut}>Reset</button>
      </div>
      <div className="user-table-scroll" role="region" aria-label="User directory" tabIndex={0}>
        <table className="user-table"><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Department</th><th scope="col">Approval</th><th scope="col">Expires</th><th scope="col">Actions</th></tr></thead>
          <tbody>{filtered.length ? filtered.map(user => <tr key={user.id}>
            <th scope="row"><div className="user-identity"><span className="user-avatar" aria-hidden="true">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span><div><div className="user-name">{user.firstName} {user.lastName}{user.id === currentUserId && <span className="user-you">You</span>}</div><span className="user-email">{user.email}</span><span className="user-campus-id">{user.id}</span></div></div></th>
            <td><span className={`user-role${user.role === "admin" ? " user-role-admin" : ""}`}>{titleCase(user.role)}</span></td>
            <td>{user.department || "—"}</td>
            <td><span className={`user-approval user-approval-${user.approval}`}><span aria-hidden="true">●</span> {titleCase(user.approval)}</span></td>
            <td className="user-date"><time dateTime={user.expires}>{dateFormat.format(new Date(`${user.expires}T00:00:00Z`))}</time></td>
            <td><div className="user-row-actions">{user.approval === "pending" && <button type="button" className="user-approve" aria-label={`Approve ${user.firstName} ${user.lastName}`} onClick={() => approve(user)}>Approve</button>}<button type="button" className="user-edit" aria-label={`Edit ${user.firstName} ${user.lastName}`} onClick={() => setEditor({ user })}>Edit</button></div></td>
          </tr>) : <tr><td colSpan={6} className="user-empty"><strong>{users.length ? "No matching users" : "No users yet"}</strong>{filteredOut && <button type="button" className="user-reset" onClick={reset}>Clear filters</button>}</td></tr>}</tbody>
        </table>
      </div>
    </section>
    <p className="user-feedback" role="status">{message}</p>
    {editor && <UserEditor user={editor.user} users={users} currentUserId={currentUserId} onSave={save} onClose={() => setEditor(null)} />}
  </div>;
}
