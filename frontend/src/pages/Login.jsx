import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LockKeyhole, ArrowRight } from "lucide-react";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await login(email.trim(), password); }
    catch (err) { setError(err.message || "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return <div className="login-screen"><div className="login-panel"><Brand/><div className="login-heading"><span className="eyebrow">FLEET MANAGEMENT</span><h1>Welcome back</h1><p>Sign in to manage your fleet operations.</p></div>
    <form onSubmit={submit} className="form-stack"><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter your password"/></label>
      {error && <div className="error-message">{error}</div>}
      <button className="button button-primary button-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"} <ArrowRight size={16}/></button>
    </form><div className="login-foot"><LockKeyhole size={14}/> Secure access for authorised users</div>
  </div></div>;
}
