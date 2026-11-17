import { useEffect, useMemo, useState } from "react";
import { Plus, Search, RefreshCw, Pencil, Trash2, UserRound, FileText } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api, unwrapList, dateLabel } from "../services/api.js";

const blank={vehicleNumber:"",vehicleType:"Truck",model:"",status:"Active"};
export default function Vehicles(){
 const [items,setItems]=useState([]),[drivers,setDrivers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [query,setQuery]=useState(""),[filter,setFilter]=useState("All"),[modal,setModal]=useState(false),[selected,setSelected]=useState(null),[form,setForm]=useState(blank),[busy,setBusy]=useState(false);
 async function load(){setLoading(true);setError("");try{const [v,d]=await Promise.all([api.get("/vehicles"),api.get("/drivers")]);setItems(unwrapList(v));setDrivers(unwrapList(d));}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 const filtered=useMemo(()=>items.filter(v=>{const text=[v.vehicleNumber,v.model,v.vehicleType,v.currentDriver?.name].join(" ").toLowerCase();return text.includes(query.toLowerCase())&&(filter==="All"||v.status===filter);}),[items,query,filter]);
 function openAdd(){setSelected(null);setForm(blank);setModal(true);}
 function openEdit(v){setSelected(v);setForm({vehicleNumber:v.vehicleNumber||"",vehicleType:v.vehicleType||"Truck",model:v.model||"",status:v.status||"Active"});setModal(true);}
 async function save(e){e.preventDefault();setBusy(true);setError("");try{if(selected)await api.put(`/vehicles/${selected._id}`,form);else await api.post("/vehicles",form);setModal(false);setSelected(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(v){if(!window.confirm(`Delete vehicle ${v.vehicleNumber}?`))return;try{await api.delete(`/vehicles/${v._id}`);await load();}catch(e){setError(e.message);}}
 return <><PageHeader title="Vehicles" description="Manage registered vehicles and their assignments." action={<><button className="button button-secondary" onClick={load}><RefreshCw size={15}/> Refresh</button><button className="button button-primary" onClick={openAdd}><Plus size={16}/> Add vehicle</button></>}/>
 {error&&<div className="notice notice-error">{error}</div>}
 <section className="panel">
  <div className="toolbar"><label className="search-field"><Search size={16}/><input placeholder="Search registration, model or driver" value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option><option>Maintenance</option></select><span className="result-count">{filtered.length} vehicles</span></div>
  {loading?<div className="table-loading">Loading vehicles...</div>:filtered.length?<div className="table-wrap"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Model</th><th>Assigned driver</th><th>Status</th><th className="actions-col">Actions</th></tr></thead><tbody>{filtered.map(v=><tr key={v._id}><td><div className="vehicle-cell"><span className="table-icon"><TruckIcon/></span><span className="cell-strong">{v.vehicleNumber}</span></div></td><td>{v.vehicleType}</td><td>{v.model}</td><td>{v.currentDriver?.name||"Unassigned"}</td><td><StatusBadge value={v.status}/></td><td><div className="row-actions"><button className="icon-button" title="Edit" onClick={()=>openEdit(v)}><Pencil size={15}/></button><button className="icon-button danger-hover" title="Delete" onClick={()=>remove(v)}><Trash2 size={15}/></button><button className="icon-button" title="Details" onClick={()=>setSelected(v)}><FileText size={15}/></button></div></td></tr>)}</tbody></table></div>:<EmptyState title="No vehicles found" message="Try changing your search or add a vehicle."/>}
 </section>
 {modal&&<Modal title={selected?"Edit vehicle":"Add vehicle"} subtitle="Vehicle information" onClose={()=>setModal(false)}><form className="form-stack" onSubmit={save}>
  <label>Registration number<input required value={form.vehicleNumber} onChange={e=>setForm({...form,vehicleNumber:e.target.value.toUpperCase()})} placeholder="e.g. MH12AB1234"/></label>
  <label>Vehicle type<select value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}><option>Truck</option><option>Trailer</option><option>Pickup</option><option>Van</option><option>Other</option></select></label>
  <label>Model<input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="e.g. Tata 407"/></label>
  <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option><option>Maintenance</option></select></label>
  <div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy?"Saving...":"Save vehicle"}</button></div>
 </form></Modal>}
 {selected&&!modal&&<Modal title={selected.vehicleNumber||"Vehicle details"} subtitle={`${selected.vehicleType||"Vehicle"} · ${selected.model||"Model not specified"}`} onClose={()=>setSelected(null)}><div className="detail-list"><div><span>Status</span><StatusBadge value={selected.status}/></div><div><span>Current driver</span><strong>{selected.currentDriver?.name||"Unassigned"}</strong></div><div><span>Driver phone</span><strong>{selected.currentDriver?.phone||"—"}</strong></div><div><span>Added</span><strong>{dateLabel(selected.createdAt)}</strong></div></div><div className="modal-actions"><button className="button button-secondary" onClick={()=>{setSelected(null);}}>Close</button><button className="button button-primary" onClick={()=>openEdit(selected)}><Pencil size={15}/> Edit vehicle</button></div></Modal>}
 </>;
}
function TruckIcon(){return <UserRound size={16}/>;}
