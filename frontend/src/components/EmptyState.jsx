import { Inbox } from "lucide-react";
export default function EmptyState({ title = "Nothing here yet", message = "Records will appear here once they are added." }) {
  return <div className="empty-state"><Inbox size={25}/><strong>{title}</strong><span>{message}</span></div>;
}
