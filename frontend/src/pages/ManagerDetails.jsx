import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Truck, Users, Route, UserRound, CalendarClock } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api, dateLabel } from "../services/api.js";
import "./ManagerDetails.css";

export default function ManagerDetails() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("vehicles");

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/admin/managers/${id}/fleet`)
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err.message || "Unable to load Manager details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="table-loading">Loading Manager fleet...</div>;
  if (error) return <><PageHeader title="Manager details"/><div className="notice notice-error">{error}</div><Link className="button button-secondary manager-back" to="/settings"><ArrowLeft size={16}/> Back to User Management</Link></>;
  if (!data) return null;

  const { manager, vehicles = [], drivers = [], assignments = [], counts = {}, recentTrips = [] } = data;
  return <>
    <PageHeader title={manager.name} description="Manager account and fleet overview." action={<Link className="button button-secondary manager-back" to="/settings"><ArrowLeft size={16}/> User Management</Link>} />
    <section className="panel manager-profile-panel">
      <div><span className="manager-eyebrow">MANAGER ACCOUNT</span><h2>{manager.name}</h2><p>{manager.email} · {manager.phone || "No phone number"}</p></div>
      <StatusBadge value={manager.isActive === false ? "Inactive" : "Active"}/>
    </section>
    <div className="manager-stat-grid">
      <button className={`manager-stat ${tab === "vehicles" ? "selected" : ""}`} onClick={() => setTab("vehicles")}><Truck/><span>Vehicles</span><strong>{counts.vehicles ?? vehicles.length}</strong></button>
      <button className={`manager-stat ${tab === "drivers" ? "selected" : ""}`} onClick={() => setTab("drivers")}><Users/><span>Drivers</span><strong>{counts.drivers ?? drivers.length}</strong></button>
      <button className={`manager-stat ${tab === "assignments" ? "selected" : ""}`} onClick={() => setTab("assignments")}><UserRound/><span>Assignments</span><strong>{assignments.length}</strong></button>
      <button className={`manager-stat ${tab === "trips" ? "selected" : ""}`} onClick={() => setTab("trips")}><Route/><span>Trips</span><strong>{counts.trips ?? recentTrips.length}</strong></button>
    </div>
    <section className="panel manager-content-panel">
      {tab === "vehicles" && <><div className="manager-section-heading"><h2>Vehicles</h2><span>{vehicles.length} total</span></div>{vehicles.length ? <div className="table-wrap"><table><thead><tr><th>Registration</th><th>Type</th><th>Model</th><th>Current driver</th><th>Approval</th><th>Status</th></tr></thead><tbody>{vehicles.map(v=><tr key={v._id}><td className="cell-strong">{v.vehicleNumber}</td><td>{v.vehicleType}</td><td>{v.model}</td><td>{v.currentDriver?.name || "Unassigned"}</td><td>{v.registrationStatus || "Approved"}</td><td><StatusBadge value={v.status}/></td></tr>)}</tbody></table></div> : <div className="manager-empty">No vehicles are currently assigned to this Manager.</div>}</>}
      {tab === "drivers" && <><div className="manager-section-heading"><h2>Drivers</h2><span>{drivers.length} total</span></div>{drivers.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>License number</th><th>Driver type</th><th>Status</th></tr></thead><tbody>{drivers.map(d=><tr key={d._id}><td className="cell-strong">{d.name}</td><td>{d.phone}</td><td>{d.licenseNumber}</td><td>{d.driverType || "Permanent"}</td><td><StatusBadge value={d.status}/></td></tr>)}</tbody></table></div> : <div className="manager-empty">No drivers registered by or assigned within this Manager's fleet.</div>}</>}
      {tab === "assignments" && <><div className="manager-section-heading"><h2>Driver assignment history</h2><span>{assignments.length} records</span></div>{assignments.length ? <div className="table-wrap"><table><thead><tr><th>Driver</th><th>Vehicle</th><th>Assigned</th><th>Released</th><th>Assignment</th></tr></thead><tbody>{assignments.map(a=><tr key={a._id}><td className="cell-strong">{a.driver?.name || "Driver record unavailable"}</td><td>{a.vehicle?.vehicleNumber || "—"}</td><td>{dateLabel(a.assignedDate)}</td><td>{a.releasedDate ? dateLabel(a.releasedDate) : "Current"}</td><td>{a.releasedDate ? "Previous" : "Active"}</td></tr>)}</tbody></table></div> : <div className="manager-empty">No driver assignment history found.</div>}</>}
      {tab === "trips" && <><div className="manager-section-heading"><h2>Recent trips</h2><span>Latest {recentTrips.length}</span></div>{recentTrips.length ? <div className="table-wrap"><table><thead><tr><th>Vehicle</th><th>Driver</th><th>Route</th><th>Start date</th><th>Status</th></tr></thead><tbody>{recentTrips.map(t=><tr key={t._id}><td className="cell-strong">{t.vehicle?.vehicleNumber || "—"}</td><td>{t.driver?.name || "—"}</td><td>{t.startLocation} → {t.endLocation}</td><td>{dateLabel(t.startDate)}</td><td><StatusBadge value={t.status}/></td></tr>)}</tbody></table></div> : <div className="manager-empty">No trips recorded for this Manager's vehicles.</div>}</>}
    </section>
  </>;
}
