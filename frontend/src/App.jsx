import React, { useState, useEffect, useRef } from "react";
import { Upload, Loader2, MapPin } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [error, setError] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [dots, setDots] = useState("");
  const [openSteps, setOpenSteps] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [streamingRoadmap, setStreamingRoadmap] = useState(false);
  const [hasStreamed, setHasStreamed] = useState(false);

  const stepRefs = {
    1: useRef(null),
    2: useRef(null),
    3: useRef(null),
    4: useRef(null),
  };
  const scrollContainerRef = useRef(null);
  const endRef = useRef(null);

  // dots animation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "·"));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // parser
  const parseOllamaOutput = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const elements = [];
    lines.forEach((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      if (trimmed.startsWith("* ")) {
        elements.push(<li key={idx}>{parts}</li>);
      } else {
        elements.push(<p key={idx}>{parts}</p>);
      }
    });
    const finalElements = [];
    let buffer = [];
    elements.forEach((el, i) => {
      if (el.type === "li") {
        buffer.push(el);
      } else {
        if (buffer.length) {
          finalElements.push(<ul key={"ul" + i}>{buffer}</ul>);
          buffer = [];
        }
        finalElements.push(el);
      }
    });
    if (buffer.length) finalElements.push(<ul key="ulEnd">{buffer}</ul>);
    return finalElements;
  };

  const scrollToStep = (step) => {
    const container = scrollContainerRef.current;
    const el = stepRefs[step]?.current;
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = container.scrollTop + (elRect.top - containerRect.top);
    container.scrollTo({ top: Math.max(0, top - 16), behavior: "smooth" });
  };

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [streamingText, results]);

  // Submit handler
  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");

    const storedUserId = localStorage.getItem("userId");
    if (!file || !targetRole || !storedUserId) {
      setError("Please upload a resume and enter your target role.");
      return;
    }

    setUserId(storedUserId); // optional if you want state to match

    setLoading(true);
    setResults({});
    setStreamingText("");
    setStreamingRoadmap(false);
    setOpenSteps({ 1: false, 2: false, 3: false, 4: false });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_role", targetRole);
    formData.append("location", location);
    formData.append("user_id", storedUserId); // send user ID from signup/login

    try {
      const res = await fetch("http://localhost:8000/analyze/", {
        method: "POST",
        body: formData,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split("\n\n");
        buffer = messages.pop();

        messages.forEach((msg) => {
          if (!msg.startsWith("data:")) return;
          const data = msg.replace(/^data: /, "").trim();
          if (data === "[DONE]") return;

          try {
            const json = JSON.parse(data);
            setResults((prev) => ({ ...prev, ...json }));

            if (json.resume) setOpenSteps((prev) => ({ ...prev, 1: true }));
            if (json.gaps) setOpenSteps((prev) => ({ ...prev, 2: true }));
            if (json.courses) setOpenSteps((prev) => ({ ...prev, 3: true }));
          } catch { }
        });
      }
    } catch (err) {
      setError("Failed to analyze resume: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const toggleStep = (step) => {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
    if (!openSteps[step]) scrollToStep(step);
  };

  const handleStreamRoadmap = async () => {
    if (!targetRole || !results.resume || !userId) return;
    setStreamingText("");
    setStreamingRoadmap(true);

    const ws = new WebSocket("ws://localhost:8000/ws/roadmap");

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          target_role: targetRole,
          resume: results.resume,
          gaps: results.gaps,
          user_id: userId,
        })
      );
      setOpenSteps((prev) => ({ ...prev, 4: true }));
      scrollToStep(4);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.token) setStreamingText((prev) => prev + data.token);
        else if (data.done) setStreamingRoadmap(false);
      } catch { }
    };

    ws.onclose = () => setStreamingRoadmap(false);

    setHasStreamed(true);
  };

  const showStreamButton = results.resume && results.gaps && results.courses && !streamingRoadmap;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-6 bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 shadow-lg rounded-b-3xl text-center">
        <h1 className="text-3xl font-bold">AI Career Mentor</h1>
        <p className="text-gray-300 mt-1">
          Personalized AI-powered career GPS for your next career move
        </p>
      </header>

      {/* Main */}
      <main className="flex flex-1 w-full h-[calc(100vh-80px)] gap-6 px-6 py-6 overflow-hidden">
        {/* Sidebar */}
        <div className="flex-none w-[340px] bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col gap-6 h-full">
          <h2 className="text-xl font-semibold text-indigo-400">Your Info</h2>

          <label className="cursor-pointer flex flex-col items-center border-2 border-dashed border-gray-600 p-6 rounded-xl hover:border-indigo-400 transition text-center">
            <Upload className="w-8 h-8 text-indigo-400 mb-2" />
            <span>{file ? file.name : "Click to upload resume (PDF)"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>

          <input
            type="text"
            placeholder="Target Role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <input
              type="text"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 transition py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-5 h-5" />}
            {loading ? `Analyzing${dots}` : "Generate Roadmap"}
          </button>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Results */}
        <div ref={scrollContainerRef} className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto h-full pr-4 scroll-smooth">
          <AccordionStep
            ref={stepRefs[1]}
            step={1}
            title="Extract Resume"
            content={loading ? <Skeleton count={5} /> : parseOllamaOutput(results.resume) || "Waiting for resume extraction..."}
            open={openSteps[1]}
            toggle={() => toggleStep(1)}
          />
          <AccordionStep
            ref={stepRefs[2]}
            step={2}
            title="Skill Gaps"
            content={loading ? <Skeleton count={5} /> : parseOllamaOutput(results.gaps) || "Waiting for skill gap analysis..."}
            open={openSteps[2]}
            toggle={() => toggleStep(2)}
          />
          <AccordionStep
            ref={stepRefs[3]}
            step={3}
            title="Courses"
            content={loading ? <Skeleton count={5} /> : parseOllamaOutput(results.courses) || "Waiting for course suggestions..."}
            open={openSteps[3]}
            toggle={() => toggleStep(3)}
          />
          <AccordionStep
            ref={stepRefs[4]}
            step={4}
            title="Career Roadmap"
            content={loading ? <Skeleton count={5} /> : parseOllamaOutput(streamingText) || (streamingRoadmap ? "Streaming..." : "Click 'Stream Roadmap' to start...")}
            open={openSteps[4]}
            toggle={() => toggleStep(4)}
            extraButton={showStreamButton && (
              <button onClick={handleStreamRoadmap} disabled={!results.resume || hasStreamed} className="bg-green-600 hover:bg-green-700 rounded-lg py-2 px-4 mb-3 font-semibold">
                Stream Roadmap
              </button>
            )}
          />
          <div ref={endRef} />
        </div>
      </main>
    </div>
  );
}

// AccordionStep component
const AccordionStep = React.forwardRef(({ step, title, content, open, toggle, extraButton }, ref) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, open]);

  return (
    <div ref={ref} className="w-full bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 transition-all cursor-pointer min-h-[88px]">
      <div className="flex justify-between items-center" onClick={toggle}>
        <h3 className="text-lg font-semibold text-indigo-400">Step {step}: {title}</h3>
        <span>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div ref={contentRef} className="mt-3 text-gray-200 whitespace-pre-wrap break-words overflow-auto max-h-[50vh]">
          {extraButton && <div className="mb-3">{extraButton}</div>}
          {content || <span className="animate-pulse">Loading...</span>}
        </div>
      )}
    </div>
  );
});
