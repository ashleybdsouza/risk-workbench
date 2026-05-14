// ─── DROP-IN REPLACEMENT for the AiBriefTab component in RiskWorkbench.jsx ──
// Replace the entire AiBriefTab function with this one.
// Also add this import at the top of RiskWorkbench.jsx:
//   import { mockBriefs } from "../data/mockBriefs";

function AiBriefTab({ event }) {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [lastEventId, setLastEventId] = useState(null);
  const timeoutsRef = useRef([]);

  // Reset when event changes
  useEffect(() => {
    if (event.id !== lastEventId) {
      // Cancel any in-progress typewriter
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      setOutput("");
      setDone(false);
      setGeneratedAt(null);
      setLastEventId(event.id);
    }
  }, [event.id]);

  function generate() {
    // Cancel any previous run
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    setOutput("");
    setDone(false);
    setLoading(true);

    const brief = mockBriefs[event.id] ?? "No pre-generated brief available for this event.";

    // Typewriter: reveal one character at a time
    // Vary speed slightly for a natural feel
    let i = 0;
    function typeNext() {
      if (i >= brief.length) {
        setLoading(false);
        setDone(true);
        setGeneratedAt(new Date().toISOString());
        return;
      }

      // Chunk by word boundary for speed — reveal ~3 chars at a time
      const chunk = brief.slice(i, i + 3);
      setOutput((prev) => prev + chunk);
      i += 3;

      // Slightly longer pause at newlines for dramatic effect
      const delay = brief[i] === "\n" ? 30 : 12;
      const t = setTimeout(typeNext, delay);
      timeoutsRef.current.push(t);
    }

    // Small initial delay so the button state visibly changes first
    const t = setTimeout(typeNext, 200);
    timeoutsRef.current.push(t);
  }

  // Render markdown-lite: ### headings and bullet points
  function renderOutput(text) {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h3 key={i}>{line.slice(4)}</h3>;
      }
      if (line.startsWith("• ") || line.startsWith("- ")) {
        return <p key={i}>• {line.slice(2)}</p>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i}>{line}</p>;
    });
  }

  return (
    <div className="wb-tab-content">
      <div className="wb-brief-wrap">
        <button
          className="wb-brief-trigger"
          onClick={generate}
          disabled={loading}
        >
          <span className="wb-brief-trigger-icon">✦</span>
          {loading ? "Generating brief..." : done ? "Regenerate Brief" : "Generate AI Analyst Brief"}
        </button>

        {(output || loading) && (
          <div className="wb-brief-output">
            {renderOutput(output)}
            {loading && <span className="wb-brief-cursor" />}
          </div>
        )}

        {done && generatedAt && (
          <div className="wb-brief-meta">
            <span>Generated {formatDateTime(generatedAt)}</span>
            <span>Model: claude-sonnet-4-20250514</span>
            <span>Event: {event.id}</span>
          </div>
        )}
      </div>
    </div>
  );
}
