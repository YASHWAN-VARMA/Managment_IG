import { Truck } from "lucide-react";
export default function Brand({ compact = false }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}>
    <div className="brand-mark"><Truck size={19} strokeWidth={1.8} /></div>
    {!compact && <div><strong>Managment_IG</strong><span>Fleet operations</span></div>}
  </div>;
}
