import { useEffect, useState } from "react";
import { ArrowUpRight, Truck, Route, Users, Fuel, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api, unwrapList, money, dateLabel } from "../services/api.js";

function Stat({ icon: Icon, label, value, note }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18}/></span></div><strong>{value}</strong><small>{note}</small></div>;
}
export default function Dashboard() {
  const [vehicles,setVehicles]=useState([]), [drivers,setDrivers]=useState([]), [trips,setTrips]=useState([]), [fuel,setFuel]=useState([]);
  const [loading,setLoading]=useState(true), [error,setError]=useState("");
  async function load() {
    setLoading(true); setError("");
    const results = await Promise.allSettled([api.get("/vehicles"),api.get("/drivers"),api.get("/trips"),api.get("/fuel-entries")]);
    if(results[0].status==="fulfilled") setVehicles(unwrapList(results[0].value));
    if(results[1].status==="fulfilled") setDrivers(unwrapList(results[1].value));
    if(results[2].status==="fulfilled") setTrips(unwrapList(results[2].value));
    if(results[3].status==="fulfilled") setFuel(unwrapList(results[3].value));
    const failed=results.find(r=>r.status==="rejected"); if(failed) setError(failed.reason.message);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);
  const activeTrips=trips.filter(t=>String(t.status).toLowerCase()==="ongoing").length;
  const availableDrivers=drivers.filter(d=>String(d.status).toLowerCase()==="active" && !d.currentTrip).length;
  const month=new Date(); const monthlyFuel=fuel.filter(f=>{const d=new Date(f.date||f.createdAt);return d.getMonth()===month.getMonth()&&d.getFullYear()===month.getFullYear();}).reduce((s,f)=>s+Number(f.totalAmount||Number(f.quantity||0)*Number(f.pricePerLitre||0)),0);
  return <><PageHeader title="Overview" description="A clear view of your fleet operations." action={<button className="button button-secondary" onClick={load}><RefreshCw size={15}/> Refresh</button>}/>
    {error && <div className="notice notice-error">{error} — check that your backend is running and the API URL is correct.</div>}
    <div className="stats-grid">
      <Stat icon={Truck} label="Total vehicles" value={loading?"—":vehicles.length} note="Registered in fleet"/>
      <Stat icon={Route} label="Active trips" value={loading?"—":activeTrips} note="Currently in progress"/>
      <Stat icon={Users} label="Available drivers" value={loading?"—":availableDrivers} note="Based on driver records"/>
      <Stat icon={Fuel} label="Fuel expenditure" value={loading?"—":money(monthlyFuel)} note="Current month"/>
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Recent trips</h2><p>Latest trip activity</p></div><Link to="/trips" className="text-link">View all <ArrowUpRight size={14}/></Link></div>
        {trips.length ? <div className="table-wrap"><table><thead><tr><th>Vehicle</th><th>Route</th><th>Driver</th><th>Status</th></tr></thead><tbody>{trips.slice(0,5).map(t=><tr key={t._id}><td className="cell-strong">{t.vehicle?.vehicleNumber||t.vehicleNumber||"—"}</td><td>{t.startLocation||"—"} → {t.endLocation||"—"}</td><td>{t.driver?.name||"—"}</td><td><StatusBadge value={t.status}/></td></tr>)}</tbody></table></div>:<EmptyState title={loading?"Loading trips...":"No trips recorded"} message="New trip records will appear here."/>}
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent fuel entries</h2><p>Latest fuel transactions</p></div><Link to="/finance" className="text-link">View all <ArrowUpRight size={14}/></Link></div>
        {fuel.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Vehicle</th><th>Amount</th></tr></thead><tbody>{fuel.slice(0,5).map(f=><tr key={f._id}><td>{dateLabel(f.date||f.createdAt)}</td><td className="cell-strong">{f.vehicle?.vehicleNumber||"—"}</td><td>{money(f.totalAmount||Number(f.quantity||0)*Number(f.pricePerLitre||0))}</td></tr>)}</tbody></table></div>:<EmptyState title={loading?"Loading entries...":"No fuel entries"} message="Fuel transactions will appear here."/>}
      </section>
    </div>
    <section className="panel alerts-panel"><div className="panel-heading"><div><h2>Operational alerts</h2><p>Items that may need attention</p></div><Link to="/documents" className="text-link">Documents <ArrowUpRight size={14}/></Link></div><div className="alert-row"><span className="alert-indicator"/> <div><strong>Document expiry checks</strong><p>Review vehicle and driver documents for upcoming expiry dates.</p></div><Link to="/documents" className="text-link">Review</Link></div></section>
  </>;
}
