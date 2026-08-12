export type WorldId = "sunroom" | "door" | "trail" | "constellation" | "studio";

export type LeoPose = "stand" | "sit" | "down" | "play" | "paw" | "sleep";

export type LeoState = {
  pose: LeoPose;
  action: string;
  message: string;
  energy: number;
  joy: number;
  bond: number;
  calm: number;
  busy: boolean;
  stay: boolean;
  updatedAt: number;
};

export type Memory = {
  id: string;
  title: string;
  story: string;
  createdAt: number;
};

export const initialState: LeoState = {
  pose: "stand",
  action: "Ready",
  message: "Leo is watching you with those warm brown eyes.",
  energy: 72,
  joy: 68,
  bond: 35,
  calm: 65,
  busy: false,
  stay: false,
  updatedAt: Date.now(),
};

export const worlds: Array<{ id: WorldId; name: string; short: string; index: string }> = [
  { id: "sunroom", name: "Sunroom", short: "Be together at home", index: "01" },
  { id: "door", name: "At the door", short: "Let Leo back inside", index: "02" },
  { id: "trail", name: "Leo Trail", short: "Explore and play", index: "03" },
  { id: "constellation", name: "Constellation", short: "Keep moments close", index: "04" },
  { id: "studio", name: "Character Studio", short: "Shape his personality", index: "05" },
];

export const commands = [
  { id: "come", label: "Come", icon: "↗", hint: "Leo, come here" },
  { id: "sit", label: "Sit", icon: "●", hint: "Sit" },
  { id: "down", label: "Lie down", icon: "━", hint: "Lie down" },
  { id: "stay", label: "Stay", icon: "⌁", hint: "Stay" },
  { id: "paw", label: "Paw", icon: "♢", hint: "Give me your paw" },
  { id: "speak", label: "Speak", icon: "))", hint: "Speak" },
  { id: "spin", label: "Spin", icon: "↻", hint: "Spin" },
  { id: "walk", label: "Walk", icon: "↠", hint: "Walk" },
  { id: "run", label: "Run", icon: "≫", hint: "Run" },
  { id: "jump", label: "Jump", icon: "↑", hint: "Jump" },
  { id: "roll-over", label: "Roll over", icon: "⟳", hint: "Roll over" },
  { id: "beg", label: "Beg", icon: "⇡", hint: "Beg" },
  { id: "sniff", label: "Sniff", icon: "⌇", hint: "Sniff around" },
  { id: "dig", label: "Dig", icon: "⌄", hint: "Dig" },
  { id: "stretch", label: "Stretch", icon: "↔", hint: "Stretch" },
  { id: "zoomies", label: "Zoomies", icon: "ϟ", hint: "Do zoomies" },
  { id: "shake", label: "Shake", icon: "≈", hint: "Shake it off" },
  { id: "scratch", label: "Scratch", icon: "⌁", hint: "Scratch your ear" },
  { id: "lick", label: "Lick", icon: "∪", hint: "Lick your nose" },
  { id: "look-around", label: "Look", icon: "◌", hint: "Look around" },
  { id: "play", label: "Play", icon: "✦", hint: "Let's play" },
  { id: "treat", label: "Treat", icon: "+", hint: "Want a treat?" },
  { id: "sleep", label: "Sleep", icon: "☾", hint: "Time to sleep" },
  { id: "wake", label: "Wake", icon: "☀", hint: "Wake up, Leo" },
  { id: "release", label: "Release", icon: "→", hint: "Okay, release" },
] as const;

export const starterMemories: Memory[] = [
  {
    id: "door-paws",
    title: "Two paws at the glass",
    story: "Leo balancing upright at the door, making absolutely sure he was seen.",
    createdAt: Date.parse("2026-08-12"),
  },
  {
    id: "nose-lick",
    title: "The perfect nose-lick",
    story: "One quick pink curl over his nose — captured at exactly the right second.",
    createdAt: Date.parse("2026-08-12") - 1,
  },
  {
    id: "patio-rest",
    title: "His sunny patio seat",
    story: "Leo settled into the warm corner, relaxed but still keeping watch.",
    createdAt: Date.parse("2026-08-12") - 2,
  },
];
