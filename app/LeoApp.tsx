"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Leo3D } from "./Leo3D";
import {
  commands,
  initialState,
  starterMemories,
  worlds,
  type LeoPose,
  type LeoState,
  type Memory,
  type WorldId,
} from "./leo-data";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
};

const aliases: Record<string, string[]> = {
  come: ["come", "come here", "leo", "hey leo"],
  sit: ["sit", "sit down"],
  down: ["down", "lie down", "lay down"],
  stay: ["stay", "wait"],
  paw: ["paw", "shake", "give me your paw"],
  speak: ["speak", "bark"],
  spin: ["spin", "turn around"],
  walk: ["walk", "go for a walk"],
  run: ["run", "run leo"],
  jump: ["jump", "jump up"],
  "roll-over": ["roll over", "roll"],
  beg: ["beg", "sit pretty"],
  sniff: ["sniff", "smell", "sniff around"],
  dig: ["dig", "dig here"],
  stretch: ["stretch", "big stretch"],
  zoomies: ["zoomies", "do zoomies", "run around"],
  shake: ["shake it off", "shake your fur"],
  scratch: ["scratch", "scratch your ear"],
  lick: ["lick", "lick your nose"],
  "look-around": ["look around", "what do you see"],
  play: ["play", "let's play", "fetch"],
  treat: ["treat", "snack", "want a treat"],
  sleep: ["sleep", "go to sleep"],
  wake: ["wake", "wake up", "wake up leo"],
  release: ["release", "okay", "stop"],
};

const actionMap: Record<string, { pose: LeoPose; message: string; duration: number }> = {
  come: { pose: "stand", message: "Leo pads over, slows down, then looks up at you.", duration: 1700 },
  sit: { pose: "sit", message: "Leo shifts his weight back and sits, eyes still on you.", duration: 900 },
  down: { pose: "down", message: "Leo lowers his chest, stretches his paws, and settles.", duration: 1100 },
  stay: { pose: "sit", message: "Leo stays exactly there — alert, patient, and very serious.", duration: 800 },
  paw: { pose: "paw", message: "Leo lifts one paw and places it carefully in your hand.", duration: 1400 },
  speak: { pose: "stand", message: "Woof! One clear Jack Russell announcement.", duration: 700 },
  spin: { pose: "stand", message: "Leo turns in one quick, delighted circle.", duration: 1250 },
  walk: { pose: "stand", message: "Leo settles into an easy four-beat walk.", duration: 2800 },
  run: { pose: "stand", message: "Leo accelerates into a bright, springy terrier run.", duration: 2400 },
  jump: { pose: "stand", message: "Leo crouches, pushes off, and lands back on all four paws.", duration: 1900 },
  "roll-over": { pose: "down", message: "Leo lowers one shoulder and rolls all the way over.", duration: 2500 },
  beg: { pose: "paw", message: "Leo balances up, both front paws lifted for a moment.", duration: 2000 },
  sniff: { pose: "stand", message: "Nose down, Leo follows an invisible trail across the floor.", duration: 2400 },
  dig: { pose: "play", message: "Leo braces and scrapes forward with quick alternating paws.", duration: 2200 },
  stretch: { pose: "play", message: "Leo reaches forward into one long, satisfying stretch.", duration: 1900 },
  zoomies: { pose: "stand", message: "Leo bursts into a tight loop of joyful terrier zoomies.", duration: 3600 },
  shake: { pose: "stand", message: "Leo shakes from nose to tail, ears flapping at the end.", duration: 1800 },
  scratch: { pose: "sit", message: "Leo tips his head and scratches carefully behind one ear.", duration: 2400 },
  lick: { pose: "sit", message: "Leo curls his tongue over his nose in one quick lick.", duration: 1200 },
  "look-around": { pose: "stand", message: "Leo scans the room, ears and nose working together.", duration: 2200 },
  play: { pose: "play", message: "Front paws down, tail up: Leo is ready to play.", duration: 1700 },
  treat: { pose: "sit", message: "Sniff… crunch… and one very satisfied nose-lick.", duration: 1600 },
  sleep: { pose: "sleep", message: "Leo circles once, curls in, and breathes softly.", duration: 1300 },
  wake: { pose: "stand", message: "Leo stretches from nose to tail and stands up.", duration: 1100 },
  release: { pose: "stand", message: "Leo is free again, waiting to see what happens next.", duration: 450 },
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function currentWorld(): WorldId {
  if (typeof window === "undefined") return "sunroom";
  const value = new URLSearchParams(window.location.search).get("world");
  return worlds.some((item) => item.id === value) ? (value as WorldId) : "sunroom";
}

function loadState(): LeoState {
  if (typeof window === "undefined") return initialState;
  try {
    const saved = localStorage.getItem("leo-state-v1");
    if (!saved) return initialState;
    const stored = { ...initialState, ...JSON.parse(saved), busy: false } as LeoState;
    return {
      ...stored,
      action: stored.stay ? "stay" : stored.pose === "sleep" ? "sleep" : "Ready",
    };
  } catch { return initialState; }
}

function loadMemories(): Memory[] {
  if (typeof window === "undefined") return starterMemories;
  try {
    const saved = localStorage.getItem("leo-memories-v1");
    return saved ? JSON.parse(saved) : starterMemories;
  } catch { return starterMemories; }
}

export default function LeoApp() {
  const [world, setWorld] = useState<WorldId>(currentWorld);
  const [state, setState] = useState<LeoState>(loadState);
  const [memories, setMemories] = useState<Memory[]>(loadMemories);
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [trailPosition, setTrailPosition] = useState(0);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("leo-state-v1", JSON.stringify({ ...state, busy: false }));
    } catch { console.warn("Leo state could not be persisted."); }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem("leo-memories-v1", JSON.stringify(memories));
    } catch { console.warn("Leo memories could not be persisted."); }
  }, [memories]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectWorld = (next: WorldId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("world", next);
    window.history.pushState({}, "", url);
    setWorld(next);
    setWorldsOpen(false);
  };

  const dispatch = useCallback((id: string) => {
    const action = actionMap[id];
    if (!action) {
      setState((prev) => ({ ...prev, message: "Leo tilts his head. Try one of the actions below." }));
      return;
    }
    if (actionTimer.current) clearTimeout(actionTimer.current);
    setState((prev) => ({
      ...prev,
      pose: action.pose,
      action: id,
      message: action.message,
      busy: true,
      stay: id === "stay" ? true : id === "release" || id === "come" ? false : prev.stay,
      energy: clamp(prev.energy + (id === "sleep" ? 10 : id === "play" || id === "spin" ? -4 : 0)),
      joy: clamp(prev.joy + (id === "play" ? 5 : id === "treat" ? 3 : id === "paw" ? 2 : 1)),
      bond: clamp(prev.bond + (id === "paw" || id === "treat" ? 2 : 0)),
      calm: clamp(prev.calm + (id === "sleep" || id === "down" ? 4 : id === "play" ? -2 : 0)),
      updatedAt: Date.now(),
    }));
    if (id === "speak") playBark();
    if (id === "come") setTrailPosition((value) => Math.min(3, value + 1));
    actionTimer.current = setTimeout(() => setState((prev) => ({
      ...prev,
      busy: false,
      action: id === "stay" || id === "sleep" ? id : "Ready",
    })), action.duration);
  }, []);

  const petLeo = () => {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    setState((prev) => ({
      ...prev,
      action: "patted",
      message: "Leo leans gently into your hand. His tail taps a happy rhythm.",
      joy: clamp(prev.joy + 2),
      bond: clamp(prev.bond + 1),
      calm: clamp(prev.calm + 2),
      busy: true,
      updatedAt: Date.now(),
    }));
    actionTimer.current = setTimeout(() => setState((prev) => ({ ...prev, busy: false, action: "Ready" })), 900);
  };

  const executeText = (raw: string) => {
    const normalized = raw.toLowerCase().replace(/[^a-z' ]/g, "").trim();
    const exact = Object.entries(aliases).find(([, values]) => values.includes(normalized));
    const found = exact ?? Object.entries(aliases)
      .flatMap(([id, values]) => values.map((value) => ({ id, value })))
      .sort((a, b) => b.value.length - a.value.length)
      .find(({ value }) => normalized.includes(value));
    if (found) dispatch(Array.isArray(found) ? found[0] : found.id);
    else setState((prev) => ({ ...prev, message: `Leo heard “${raw}” and tilted his head. Choose an action so he can learn.` }));
    setCommand("");
  };

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    if (command.trim()) executeText(command);
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setToast("Voice recognition is not supported here. Typed and button commands still work.");
      return;
    }
    const instance = new Recognition();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = "en-US";
    instance.onstart = () => setListening(true);
    instance.onend = () => setListening(false);
    instance.onerror = () => {
      setListening(false);
      setToast("Leo could not hear that. You can type or tap the same command.");
    };
    instance.onresult = (event) => executeText(event.results[0][0].transcript);
    recognition.current = instance;
    instance.start();
  };

  const addMemory = (title: string, story: string) => {
    setMemories((items) => [{ id: crypto.randomUUID(), title, story, createdAt: Date.now() }, ...items]);
    setMemoryOpen(false);
    setToast("Memory saved privately on this device.");
  };

  const exportMemories = () => {
    const blob = new Blob([JSON.stringify({ version: 1, leo: state, memories }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "leo-memories.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const worldMeta = useMemo(() => worlds.find((item) => item.id === world)!, [world]);

  return (
    <main className={`app world-${world}`}>
      <header className="topbar">
        <button className="brand" onClick={() => selectWorld("sunroom")} aria-label="Go to Leo's Sunroom">
          <span className="brand-mark">L</span>
          <span><strong>LEO</strong><small>Interactive companion</small></span>
        </button>
        <button className="world-switch" onClick={() => setWorldsOpen(true)}>
          <span>{worldMeta.index}</span>{worldMeta.name}<b>⌄</b>
        </button>
        <button className="memory-button" onClick={() => setMemoryOpen(true)}>＋ <span>Add a memory</span></button>
      </header>

      {world === "sunroom" && <Sunroom state={state} pet={petLeo} dispatch={dispatch} memories={memories} />}
      {world === "door" && <DoorWorld state={state} pet={petLeo} dispatch={dispatch} open={doorOpen} setOpen={setDoorOpen} />}
      {world === "trail" && <TrailWorld state={state} pet={petLeo} dispatch={dispatch} position={trailPosition} setPosition={setTrailPosition} />}
      {world === "constellation" && <Constellation state={state} pet={petLeo} memories={memories} dispatch={dispatch} />}
      {world === "studio" && <Studio state={state} pet={petLeo} dispatch={dispatch} memories={memories} />}

      <CommandDock
        state={state}
        command={command}
        setCommand={setCommand}
        submit={submitCommand}
        dispatch={dispatch}
        listening={listening}
        listen={startListening}
      />

      {worldsOpen && <WorldPicker active={world} select={selectWorld} close={() => setWorldsOpen(false)} />}
      {memoryOpen && <MemoryModal close={() => setMemoryOpen(false)} save={addMemory} exportData={exportMemories} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function Status({ state }: { state: LeoState }) {
  return (
    <div className="status-strip" aria-label="Leo's current state">
      <span><i style={{ width: `${state.joy}%` }} />Joy <b>{state.joy}</b></span>
      <span><i style={{ width: `${state.energy}%` }} />Energy <b>{state.energy}</b></span>
      <span><i style={{ width: `${state.bond}%` }} />Bond <b>{state.bond}</b></span>
    </div>
  );
}

function Sunroom({ state, pet, dispatch, memories }: WorldProps & { memories: Memory[] }) {
  return (
    <section className="sunroom scene" aria-labelledby="sunroom-title">
      <div className="sun-copy">
        <p className="eyebrow">A quiet place that is always open</p>
        <h1 id="sunroom-title">Come sit with <em>Leo.</em></h1>
        <p>{state.message}</p>
        <Status state={state} />
      </div>
      <div className="window-light" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="rug" aria-hidden="true" />
      <div className="plant" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="actor-stage home-stage"><Leo3D pose={state.pose} action={state.action} onPet={pet} /></div>
      <button className="scene-object bed-object" onClick={() => dispatch("sleep")}><span>☾</span>His quiet corner</button>
      <button className="scene-object shelf-object" onClick={() => dispatch("paw")}><span>{memories.length}</span>Memory shelf</button>
    </section>
  );
}

function DoorWorld({ state, pet, dispatch, open, setOpen }: WorldProps & { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <section className={`door-world scene ${open ? "is-open" : ""}`} aria-labelledby="door-title">
      <div className="door-copy">
        <p className="eyebrow">The welcome that never gets old</p>
        <h1 id="door-title">Someone is<br />at the door.</h1>
        <p>{open ? state.message : "Leo is waiting on the other side, nose close to the glass."}</p>
      </div>
      <div className="door-frame">
        <div className="glass-panel"><div className="actor-stage door-stage"><Leo3D pose={open ? state.pose : "paw"} action={state.action} onPet={pet} compact /></div></div>
        <button className="door-handle" onClick={() => { setOpen(!open); if (!open) dispatch("come"); }} aria-label={open ? "Close the door" : "Open the door for Leo"}><i /></button>
      </div>
      <div className="door-actions">
        <button onClick={() => { setOpen(true); dispatch("come"); }}>Open for Leo <b>→</b></button>
        <button onClick={() => dispatch("paw")}>Paws on the glass</button>
      </div>
      <p className="door-caption">Inspired by Leo&apos;s unmistakable two-paw knock.</p>
    </section>
  );
}

function TrailWorld({ state, pet, dispatch, position, setPosition }: WorldProps & { position: number; setPosition: (v: number) => void }) {
  const spots = ["Gate", "Sniffing stones", "Sunny path", "Rest tree"];
  return (
    <section className="trail-world scene" aria-labelledby="trail-title">
      <div className="trail-head">
        <p className="eyebrow">Leo Trail · today&apos;s little adventure</p>
        <h1 id="trail-title">Follow his nose.</h1>
        <p>{state.message}</p>
      </div>
      <div className="trail-map">
        <div className="trail-line" aria-hidden="true" />
        {spots.map((spot, index) => (
          <button key={spot} className={`trail-spot spot-${index} ${position === index ? "active" : ""}`} onClick={() => { setPosition(index); dispatch(index === 3 ? "down" : index === 1 ? "play" : "come"); }}>
            <i>{index + 1}</i><span>{spot}</span>
          </button>
        ))}
        <div className={`actor-stage trail-stage trail-pos-${position}`}><Leo3D pose={state.pose} action={state.action} onPet={pet} compact /></div>
        <span className="tree tree-one" aria-hidden="true">✦</span><span className="tree tree-two" aria-hidden="true">✦</span>
      </div>
      <div className="trail-log"><b>Trail note</b><span>{position + 1} of 4</span><p>{spots[position]} — Leo chose this stop.</p></div>
    </section>
  );
}

function Constellation({ state, pet, memories, dispatch }: WorldProps & { memories: Memory[] }) {
  return (
    <section className="constellation scene" aria-labelledby="stars-title">
      <div className="stars-copy">
        <p className="eyebrow">Leo constellation · {memories.length} lights</p>
        <h1 id="stars-title">Every small moment<br />finds its way back.</h1>
        <p>{state.message}</p>
      </div>
      <div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
      <div className="actor-stage star-stage"><Leo3D pose={state.pose === "stand" ? "sit" : state.pose} action={state.action} onPet={pet} /></div>
      <div className="memory-stars">
        {memories.slice(0, 5).map((memory, index) => <button key={memory.id} className={`memory-star star-${index}`} onClick={() => dispatch(index % 2 ? "paw" : "come")}><i />{memory.title}</button>)}
      </div>
      <button className="quiet-button" onClick={() => dispatch(state.pose === "sleep" ? "wake" : "sleep")}>{state.pose === "sleep" ? "Wake gently" : "Enter quiet mode"}</button>
    </section>
  );
}

function Studio({ state, pet, dispatch, memories }: WorldProps & { memories: Memory[] }) {
  return (
    <section className="studio scene" aria-labelledby="studio-title">
      <div className="studio-title">
        <p className="eyebrow">Leo character studio / live</p>
        <h1 id="studio-title">Build the details<br />that feel like <em>him.</em></h1>
      </div>
      <div className="studio-stage">
        <span className="stage-label">Live Leo · {state.action}</span>
        <div className="actor-stage"><Leo3D pose={state.pose} action={state.action} onPet={pet} /></div>
        <p>{state.message}</p>
      </div>
      <div className="sequence-panel">
        <div><span>Current sequence</span><b>01 / 04</b></div>
        <button onClick={() => dispatch("come")}><i>1</i>Call <b>→</b></button>
        <button onClick={() => dispatch("sit")}><i>2</i>Sit <b>→</b></button>
        <button onClick={() => dispatch("paw")}><i>3</i>Paw <b>→</b></button>
        <button onClick={() => dispatch("treat")}><i>4</i>Reward <b>✓</b></button>
      </div>
      <div className="personality-panel">
        <p>Personality signal</p><strong>{state.joy > 70 ? "Bright-eyed & ready" : "Gentle observer"}</strong>
        <span>{memories.length} memories shaping this Leo</span>
      </div>
    </section>
  );
}

type WorldProps = { state: LeoState; pet: () => void; dispatch: (id: string) => void };

function CommandDock({ state, command, setCommand, submit, dispatch, listening, listen }: {
  state: LeoState; command: string; setCommand: (v: string) => void; submit: (e: FormEvent) => void; dispatch: (id: string) => void; listening: boolean; listen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? commands : commands.slice(0, 6);
  return (
    <aside className="command-dock" aria-label="Interact with Leo">
      <div className="dock-message"><span className={state.busy ? "live" : ""} /> <b>{state.busy ? "Leo is moving" : state.stay ? "Leo is staying" : "Leo is with you"}</b><p>{state.message}</p></div>
      <div className="command-grid">
        {shown.map((item) => <button key={item.id} onClick={() => dispatch(item.id)} title={item.hint}><i>{item.icon}</i><span>{item.label}</span></button>)}
        <button className="more-command" onClick={() => setExpanded(!expanded)}><i>{expanded ? "−" : "+"}</i><span>{expanded ? "Less" : "More"}</span></button>
      </div>
      <form className="command-input" onSubmit={submit}>
        <label htmlFor="talk-to-leo">Talk to Leo</label>
        <input id="talk-to-leo" value={command} onChange={(e) => setCommand(e.target.value)} aria-label="Type a command for Leo" />
        <button type="submit" disabled={!command.trim()} aria-label="Send command">→</button>
        <button type="button" className={listening ? "listening" : ""} onClick={listen} aria-label={listening ? "Listening" : "Use voice command"}>{listening ? "●" : "◉"}</button>
      </form>
    </aside>
  );
}

function WorldPicker({ active, select, close }: { active: WorldId; select: (id: WorldId) => void; close: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="world-picker-title">
      <div className="world-picker">
        <div className="modal-head"><div><p>Five complete experiences</p><h2 id="world-picker-title">Where should Leo be?</h2></div><button onClick={close} aria-label="Close">×</button></div>
        <div className="world-list">{worlds.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => select(item.id)}><i>{item.index}</i><span><b>{item.name}</b><small>{item.short}</small></span><strong>→</strong></button>)}</div>
        <p className="likeness-note">A local interactive likeness of Leo — not Leo&apos;s consciousness and not a cloud chatbot.</p>
      </div>
    </div>
  );
}

function MemoryModal({ close, save, exportData }: { close: () => void; save: (title: string, story: string) => void; exportData: () => void }) {
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim() && story.trim()) save(title.trim(), story.trim()); };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="memory-title">
      <form className="memory-modal" onSubmit={submit}>
        <div className="modal-head"><div><p>Private on this device</p><h2 id="memory-title">Remember this about Leo</h2></div><button type="button" onClick={close} aria-label="Close">×</button></div>
        <label>Give this moment a name<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>What happened?<textarea value={story} onChange={(e) => setStory(e.target.value)} rows={5} /></label>
        <div className="modal-actions"><button type="button" onClick={exportData}>Export all memories</button><button type="submit" disabled={!title.trim() || !story.trim()}>Keep this memory</button></div>
      </form>
    </div>
  );
}

function playBark() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(180, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(90, context.currentTime + 0.16);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.21);
  } catch { /* Audio is an enhancement; visible reaction remains. */ }
}
