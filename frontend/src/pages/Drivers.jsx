import { useEffect,useMemo,useState } from "react";
import { Plus,Search,RefreshCw,Pencil,Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import {api,unwrapList,dateLabel} from "../services/api.js";
const empty={name:"",phone:"",licenseNumber:"",address:"",status:"Active"};
export default function Drivers(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[q,setQ]=useState(""),[modal,setModal]=useState(false),[form,setForm]=useState(empty),[busy,setBusy]=useState(false);
 async function load(){setLoading(true);try{setItems(unwrapList(await api.get("/drivers")));setError("");}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 const filtered=useMemo(()=>items.filter(d=>[d.name,d.phone,d.licenseNumber].join(" ").toLowerCase().includes(q.toLowerCase())),[items,q]);
 async function save(e){e.preventDefault();setBusy(true);try{await api.post("/drivers",form);setModal(false);setForm(empty);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <><PageHeader title="Drivers" description="Maintain driver profiles and licence information." action={<><button className="button button-secondary" onClick={load}><RefreshCw size={15}/> Refresh</button><button className="button button-primary" onClick={()=>setModal(true)}><Plus size={16}/> Add driver</button></>}/>
 {error&&<div className="notice notice-error">{error}</div>}<section className="panel"><div className="toolbar"><label className="search-field"><Search size={16}/><input placeholder="Search name, phone or licence" value={q} onChange={e=>setQ(e.target.value)}/></label><span className="result-count">{filtered.length} drivers</span></div>
 {loading?<div className="table-loading">Loading drivers...</div>:filtered.length?<div className="table-wrap"><table><thead><tr><th>Driver</th><th>Phone</th><th>Licence number</th><th>Address</th><th>Status</th><th>Added</th></tr></thead><tbody>{filtered.map(d=><tr key={d._id}><td className="cell-strong">{d.name}</td><td>{d.phone}</td><td>{d.licenseNumber}</td><td>{d.address||"—"}</td><td><StatusBadge value={d.status}/></td><td>{dateLabel(d.createdAt)}</td></tr>)}</tbody></table></div>:<EmptyState title="No drivers found" message="Add a driver to start managing assignments."/>}</section>
 {modal&&<Modal title="Add driver" subtitle="Create a driver profile" onClose={()=>setModal(false)}><form className="form-stack" onSubmit={save}><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Phone number<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Licence number<input required value={form.licenseNumber} onChange={e=>setForm({...form,licenseNumber:e.target.value.toUpperCase()})}/></label><label>Address<textarea rows="2" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Inactive</option></select></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy?"Saving...":"Save driver"}</button></div></form></Modal>}
 </>;
}
