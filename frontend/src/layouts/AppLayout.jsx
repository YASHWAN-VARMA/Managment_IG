import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, LayoutDashboard, Truck, Users, Route, Wallet, FolderOpen, ChartNoAxesCombined, Settings, Menu, Search, LogOut, X } from "lucide-react";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";
const navItems = [
  ["Overview", "/", LayoutDashboard],
  ["Vehicles", "/vehicles", Truck],
  ["Drivers", "/drivers", Users],
  ["Trips", "/trips", Route],
  ["Finance", "/finance", Wallet],
  ["Documents", "/documents", FolderOpen],
  ["Reports", "/reports", ChartNoAxesCombined],
  ["Settings", "/settings", Settings],
];
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuth();
  const location = useLocation();
  const visibleNav = user?.role === "Admin" ? [...navItems.slice(0,1), ["Approvals", "/approvals", Bell], ...navItems.slice(1)] : navItems;
  const current = visibleNav.find((item) => item[1] === location.pathname)?.[0] || "Overview";

  const nav = <><div className="sidebar-brand"><Brand /></div><nav className="sidebar-nav">
    <span className="nav-caption">WORKSPACE</span>
    {visibleNav.map(([label, path, Icon]) => <NavLink key={path} to={path} end={path === "/"} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
      <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
    </NavLink>)}
  </nav><div className="sidebar-bottom"><div className="connection-dot"/> API connection configured in environment</div></>;
  return <div className="app-shell">
    <aside className="sidebar">{nav}</aside>
    {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}><aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}><button className="drawer-close icon-button" onClick={() => setDrawerOpen(false)}><X/></button>{nav}</aside></div>}
    <div className="main-area">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setDrawerOpen(true)}><Menu/></button>
        <div className="breadcrumb"><span>Workspace</span><b>/</b>{current}</div>
        <div className="topbar-right">
          <label className="global-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" /><kbd>⌘ K</kbd></label>
          <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
          <div className="profile-chip"><div className="avatar">{(user?.name || user?.email || "U").slice(0,1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.name || "Account"}</strong><span>{user?.role || "User"}</span></div></div>
          <button className="icon-button logout-button" onClick={logout} title="Sign out"><LogOut size={17}/></button>
        </div>
      </header>
      <main className="page-content"><Outlet /></main>
      <nav className="mobile-bottom-nav">
        {visibleNav.slice(0,4).map(([label,path,Icon]) => <NavLink key={path} to={path} end={path === "/"}><Icon size={19}/><span>{label}</span></NavLink>)}
      </nav>
    </div>
  </div>;
}