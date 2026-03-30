import { useRef, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  XIcon, ImageIcon, CameraIcon, MapPinIcon,
  FileTextIcon, BarChart2Icon, PlusIcon, TrashIcon,
} from "lucide-react";
import toast from "react-hot-toast";

/* ── Poll creator sub-panel ──────────────────────────────── */
const PollCreator = ({ onSend, onClose }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiSelect, setMultiSelect] = useState(false);

  const addOption = () => { if (options.length < 10) setOptions(p => [...p, ""]); };
  const removeOption = (i) => { if (options.length > 2) setOptions(p => p.filter((_, idx) => idx !== i)); };
  const updateOption = (i, val) => setOptions(p => p.map((o, idx) => idx === i ? val : o));

  const handleSend = () => {
    if (!question.trim()) { toast.error("Enter a question"); return; }
    const validOpts = options.map(o => o.trim()).filter(Boolean);
    if (validOpts.length < 2) { toast.error("Add at least 2 options"); return; }
    onSend({
      question: question.trim(),
      options: validOpts.map((text, i) => ({ id: `opt_${i}`, text })),
      multiSelect,
      votes: {},
    });
  };

  return (
    <div className="att-panel">
      <div className="att-panel__header">
        <BarChart2Icon className="w-4 h-4 text-purple-500" />
        <span>Create Poll</span>
        <button className="att-panel__back" onClick={onClose}><XIcon className="w-4 h-4" /></button>
      </div>
      <div className="att-panel__body">
        <label className="att-panel__label">Question</label>
        <input className="att-panel__input" placeholder="Ask something…" value={question}
          onChange={e => setQuestion(e.target.value)} autoFocus maxLength={200} />

        <label className="att-panel__label" style={{ marginTop: 12 }}>Options</label>
        {options.map((opt, i) => (
          <div key={i} className="att-panel__option-row">
            <input className="att-panel__input att-panel__input--option"
              placeholder={`Option ${i + 1}`} value={opt}
              onChange={e => updateOption(i, e.target.value)} maxLength={100} />
            {options.length > 2 && (
              <button className="att-panel__remove-opt" onClick={() => removeOption(i)}>
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button className="att-panel__add-opt" onClick={addOption}>
            <PlusIcon className="w-3.5 h-3.5" /> Add option
          </button>
        )}
        <label className="att-panel__checkbox-row" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={multiSelect}
            onChange={e => setMultiSelect(e.target.checked)} className="att-panel__checkbox" />
          <span className="att-panel__checkbox-label">Allow multiple selections</span>
        </label>
      </div>
      <div className="att-panel__footer">
        <button className="att-panel__send-btn" onClick={handleSend}>Send Poll</button>
      </div>
    </div>
  );
};

/* ── Main AttachmentModal ────────────────────────────────── */
const AttachmentModal = ({ onClose, onGallery, onCamera, onFile, onLocation, onPoll }) => {
  const { user } = useUser();
  const [subPanel, setSubPanel] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const MENU = [
    { id: "gallery",  icon: <ImageIcon className="w-5 h-5" />,    label: "Gallery",   color: "#8b5cf6", action: () => { onGallery(); onClose(); } },
    { id: "camera",   icon: <CameraIcon className="w-5 h-5" />,   label: "Camera",    color: "#06b6d4", action: () => { onCamera(); onClose(); } },
    { id: "location", icon: <MapPinIcon className="w-5 h-5" />,   label: "Location",  color: "#ef4444", action: () => { onLocation(); onClose(); } },
    { id: "document", icon: <FileTextIcon className="w-5 h-5" />, label: "Document",  color: "#f59e0b", action: () => { onFile(); onClose(); } },
    { id: "poll",     icon: <BarChart2Icon className="w-5 h-5" />,label: "Poll",      color: "#10b981", action: () => setSubPanel("poll") },
  ];

  if (subPanel === "poll") {
    return (
      <div className="att-modal-overlay">
        <div ref={ref} className="att-modal">
          <PollCreator onSend={(poll) => { onPoll(poll); onClose(); }} onClose={() => setSubPanel(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="att-modal-overlay">
      <div ref={ref} className="att-modal att-modal--menu">
        <div className="att-modal__profile">
          {user?.imageUrl
            ? <img src={user.imageUrl} alt={user.fullName || "You"} className="att-modal__avatar" />
            : <div className="att-modal__avatar att-modal__avatar--placeholder">
                {(user?.fullName || user?.username || "U")[0].toUpperCase()}
              </div>
          }
          <div>
            <p className="att-modal__profile-name">{user?.fullName || user?.username || "You"}</p>
            <p className="att-modal__profile-sub">Choose what to share</p>
          </div>
          <button className="att-modal__close" onClick={onClose}><XIcon className="w-4 h-4" /></button>
        </div>

        <div className="att-modal__grid">
          {MENU.map(item => (
            <button key={item.id} className="att-menu-item" onClick={item.action}>
              <div className="att-menu-item__icon" style={{ background: item.color + "20", color: item.color }}>
                {item.icon}
              </div>
              <span className="att-menu-item__label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttachmentModal;
