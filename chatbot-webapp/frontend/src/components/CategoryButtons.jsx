import { PhoneCall, HeartHandshake, Stethoscope, ShieldCheck, Landmark, Scale } from "lucide-react";

const CATEGORIES = [
  {
    key: "helpline",
    label: "Helpline",
    icon: PhoneCall,
    prompt: "I'd like to connect with the helpline.",
    classes: "bg-[#B65C4A] hover:bg-[#A14E3D] text-white",
  },
  {
    key: "counsellor",
    label: "Counsellor",
    icon: HeartHandshake,
    prompt: "I'd like to talk to a counsellor.",
    classes: "bg-teal hover:bg-teal-dark text-white",
  },
  {
    key: "medical",
    label: "Medical",
    icon: Stethoscope,
    prompt: "I need medical support.",
    classes: "bg-[#3E5C76] hover:bg-[#31485E] text-white",
  },
  {
    key: "protection",
    label: "Protection",
    icon: ShieldCheck,
    prompt: "I need help with protection and safety.",
    classes: "bg-[#B8863A] hover:bg-[#A0752F] text-white",
  },
  // {
  //   key: "financial",
  //   label: "Financial",
  //   icon: Landmark,
  //   prompt: "I have a question about financial support.",
  //   classes: "bg-[#4E6B4E] hover:bg-[#3F583F] text-white",
  // },
  // {
  //   key: "legal",
  //   label: "Legal",
  //   icon: Scale,
  //   prompt: "I need legal guidance.",
  //   classes: "bg-[#5B5088] hover:bg-[#4A4171] text-white",
  // },
];

export default function CategoryButtons({ onSelect, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map(({ key, label, icon: Icon, prompt, classes }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
        >
          <Icon size={15} strokeWidth={2.2} />
          {label}
        </button>
      ))}
    </div>
  );
}
