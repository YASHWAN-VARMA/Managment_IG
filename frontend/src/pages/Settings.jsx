import PageHeader from "../components/PageHeader.jsx";
import {useAuth} from "../context/AuthContext.jsx";
import {ShieldCheck,Monitor,UserCircle} from "lucide-react";
export default function Settings(){
 const {user}=useAuth();
 return <><PageHeader title="Settings" description="Account and application information."/><div className="settings-grid">
 <section className="panel settings-section"><div className="settings-title"><UserCircle/><div><h2>Account</h2><p>Signed-in user information</p></div></div><div className="detail-list"><div><span>Name</span><strong>{user?.name||"—"}</strong></div><div><span>Email</span><strong>{user?.email||"—"}</strong></div><div><span>Role</span><strong>{user?.role||"—"}</strong></div></div></section>
 <section className="panel settings-section"><div className="settings-title"><Monitor/><div><h2>Appearance</h2><p>Current interface configuration</p></div></div><div className="detail-list"><div><span>Theme</span><strong>Dark charcoal</strong></div><div><span>Accent</span><strong>Monochrome</strong></div><div><span>Typography</span><strong>Inter</strong></div></div></section>
 <section className="panel settings-section"><div className="settings-title"><ShieldCheck/><div><h2>Access</h2><p>Role-based access is enforced by the backend</p></div></div><p className="settings-note">Admin and Manager permissions are controlled by your existing API middleware. This frontend does not replace backend authorization.</p></section>
 </div></>;
}
