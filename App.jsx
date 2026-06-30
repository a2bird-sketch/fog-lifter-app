import { useState, useMemo } from "react";

/* ============================================================================
   FOG LIFTER  v1
   ----------------------------------------------------------------------------
   Detects manipulation and fabrication TELLS in a passage. It does not rule on
   whether a claim is true. It shows you the moves the text is making on you.

   METHODOLOGY-TESTING ZONE
   The two constants below (TELLS and buildSystemPrompt) are the product right
   now. Edit them to tune detection. Everything under the divider is plumbing
   you should not need to touch during methodology testing.
   ========================================================================== */

const TELLS = [
  {
    id: "loaded_language",
    label: "Loaded language",
    color: "#D98324",
    define:
      "Word choice doing argumentative work the evidence has not earned. Adjectives and verbs that pre-decide how you should feel before you have seen a reason.",
  },
  {
    id: "vague_unfalsifiable",
    label: "Vague / unfalsifiable",
    color: "#7A8B5A",
    define:
      "A claim built so it can never be checked or wrong. Weasel phrasing, missing actor, no number, no source you could go verify.",
  },
  {
    id: "false_urgency",
    label: "False urgency",
    color: "#B5482E",
    define:
      "Manufactured time pressure or scarcity that exists to stop you thinking, not because the clock is real.",
  },
  {
    id: "fear_outrage",
    label: "Fear / outrage hook",
    color: "#9E2B25",
    define:
      "Content engineered to spike threat or anger so the emotion carries the argument the facts can't.",
  },
  {
    id: "strawman",
    label: "Strawman",
    color: "#6B5B95",
    define:
      "A weakened or invented version of the other side, set up so it is easy to knock down.",
  },
  {
    id: "anecdote_as_proof",
    label: "Anecdote as proof",
    color: "#4A6670",
    define:
      "A single story or example presented as if it settles a general pattern. The vivid case stands in for data.",
  },
  {
    id: "false_binary",
    label: "False binary",
    color: "#856042",
    define:
      "Two options framed as the only options, when the real space has more. Forces a side by hiding the middle.",
  },
  {
    id: "unsourced_authority",
    label: "Unsourced authority",
    color: "#3F6F6F",
    define:
      "Appeal to experts, studies, or sources that are never named, so you cannot check whether they say what is claimed.",
  },
  {
    id: "manufactured_consensus",
    label: "Manufactured consensus",
    color: "#5C7A99",
    define:
      "Everyone knows, people are saying, we all agree. Borrows the weight of a crowd that has not been shown to exist.",
  },
  {
    id: "deflection",
    label: "Deflection / whataboutism",
    color: "#8A6D3B",
    define:
      "Changes the subject to someone else's fault instead of answering the point on the table.",
  },
  {
    // The proprietary category. This is the one a generic build does not have.
    id: "decoy_occult",
    label: "Decoy occult",
    color: "#7A4FA0",
    define:
      "Takes a legitimate suspicion and reroutes it into a claim built so it can never be checked, capturing the distrust instead of resolving it.",
  },
];

/* ============================================================================
   The analysis prompt now lives SERVER-SIDE in the Supabase Edge Function
   (supabase/functions/analyze). That keeps the Anthropic key off the client
   and keeps the proprietary prompt out of the public JS bundle.

   EDIT: paste your Supabase function URL here after you create the project.
   It looks like: https://YOUR-PROJECT-REF.supabase.co/functions/v1/analyze
   ========================================================================== */
const FUNCTION_URL = "https://pijjvxgldosuuiyrivyg.supabase.co/functions/v1/analyze";

/* ============================================================================
   PLUMBING BELOW  ----  taxonomy testing does not require edits past this line
   ========================================================================== */

const COLORS = {
  fog: "#DCE2E6",
  fogDeep: "#C3CCD2",
  panel: "#FBFCFC",
  ink: "#1A2228",
  inkSoft: "#566069",
  line: "#B7C0C6",
  signal: "#D98324",
};

const tellById = (id) => TELLS.find((t) => t.id === id);

async function analyze(text) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Analysis request failed");
  const data = await res.json();
  return Array.isArray(data.flags) ? data.flags : [];
}

// Splits source text into segments, marking which fall inside a flagged span.
function segment(text, flags) {
  const marks = [];
  flags.forEach((f, i) => {
    if (!f.span) return;
    let from = 0;
    let at = text.indexOf(f.span, from);
    if (at !== -1) marks.push({ start: at, end: at + f.span.length, flagIndex: i });
  });
  marks.sort((a, b) => a.start - b.start);
  const out = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start < cursor) continue; // skip overlaps
    if (m.start > cursor) out.push({ text: text.slice(cursor, m.start), flagIndex: null });
    out.push({ text: text.slice(m.start, m.end), flagIndex: m.flagIndex });
    cursor = m.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), flagIndex: null });
  return out;
}

const SAMPLE = `Everyone knows the new ordinance is a disaster waiting to happen. Studies show it will destroy thousands of jobs almost overnight, and we have to act before it is too late. The other side wants total government control of your business, plain and simple. My neighbor lost his shop the week a rule like this passed, so the pattern is obvious. You are either with the families who built this town or with the bureaucrats who want to bury them.`;

export default function App() {
  const [text, setText] = useState("");
  const [flags, setFlags] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);

  const segments = useMemo(
    () => (flags ? segment(text, flags) : []),
    [flags, text]
  );

  const usedTells = useMemo(() => {
    if (!flags) return [];
    const ids = [...new Set(flags.map((f) => f.tell))];
    return ids.map(tellById).filter(Boolean);
  }, [flags]);

  async function run() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setActive(null);
    try {
      const result = await analyze(text);
      setFlags(result);
    } catch (e) {
      setError("Analysis failed to return clean results. Try again, or shorten the passage.");
      setFlags(null);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setText("");
    setFlags(null);
    setError(null);
    setActive(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.fog,
        color: COLORS.ink,
        fontFamily:
          "'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif",
        padding: "clamp(20px, 5vw, 56px)",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* Masthead */}
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: COLORS.inkSoft,
              marginBottom: 10,
            }}
          >
            Peregrine Frontiers
          </div>
          <h1
            style={{
              fontSize: "clamp(40px, 7vw, 68px)",
              lineHeight: 0.95,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Fog Lifter
          </h1>
          <p
            style={{
              fontSize: "clamp(15px, 2.2vw, 18px)",
              color: COLORS.inkSoft,
              maxWidth: 560,
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            Paste any passage. See the manipulation and fabrication tells, named
            and explained. It does not tell you what is true. It shows you what
            the text is doing to you.
          </p>
        </header>

        {/* Input */}
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 4,
            padding: 4,
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a paragraph from an article, a post, an ad, a speech."
            rows={7}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "vertical",
              background: "transparent",
              color: COLORS.ink,
              fontSize: 16,
              lineHeight: 1.6,
              padding: 18,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "8px 12px 12px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={run}
              disabled={loading || !text.trim()}
              style={{
                background: loading || !text.trim() ? COLORS.fogDeep : COLORS.ink,
                color: loading || !text.trim() ? COLORS.inkSoft : COLORS.panel,
                border: "none",
                borderRadius: 3,
                padding: "11px 22px",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.02em",
                cursor: loading || !text.trim() ? "default" : "pointer",
              }}
            >
              {loading ? "Lifting the fog…" : "Lift the fog"}
            </button>
            <button
              onClick={() => setText(SAMPLE)}
              style={{
                background: "transparent",
                color: COLORS.inkSoft,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 3,
                padding: "11px 16px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Load sample
            </button>
            {(flags || error) && (
              <button
                onClick={reset}
                style={{
                  background: "transparent",
                  color: COLORS.inkSoft,
                  border: "none",
                  fontSize: 14,
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 4,
              background: COLORS.panel,
              color: COLORS.inkSoft,
              fontSize: 15,
            }}
          >
            {error}
          </div>
        )}

        {/* Results */}
        {flags && !error && (
          <div style={{ marginTop: 28 }}>
            {flags.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  background: COLORS.panel,
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 4,
                  fontSize: 16,
                }}
              >
                No tells flagged. The passage reads clean on the v1 taxonomy.
                That is not a verdict on whether it is true, only that it is not
                pulling the moves Fog Lifter looks for.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 24 }}>
                {/* Annotated source */}
                <div
                  style={{
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    borderRadius: 4,
                    padding: "clamp(20px, 4vw, 32px)",
                    fontSize: 18,
                    lineHeight: 1.85,
                  }}
                >
                  {segments.map((seg, i) =>
                    seg.flagIndex === null ? (
                      <span key={i}>{seg.text}</span>
                    ) : (
                      <mark
                        key={i}
                        onClick={() =>
                          setActive(active === seg.flagIndex ? null : seg.flagIndex)
                        }
                        style={{
                          background:
                            (tellById(flags[seg.flagIndex].tell)?.color ||
                              COLORS.signal) + "2E",
                          borderBottom: `2px solid ${
                            tellById(flags[seg.flagIndex].tell)?.color ||
                            COLORS.signal
                          }`,
                          color: COLORS.ink,
                          cursor: "pointer",
                          padding: "1px 2px",
                          borderRadius: 2,
                          outline:
                            active === seg.flagIndex
                              ? `2px solid ${
                                  tellById(flags[seg.flagIndex].tell)?.color
                                }`
                              : "none",
                        }}
                      >
                        {seg.text}
                      </mark>
                    )
                  )}
                </div>

                {/* Flag list */}
                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: COLORS.inkSoft,
                    }}
                  >
                    {flags.length} tell{flags.length === 1 ? "" : "s"} found
                  </div>
                  {flags.map((f, i) => {
                    const t = tellById(f.tell);
                    return (
                      <div
                        key={i}
                        onClick={() => setActive(active === i ? null : i)}
                        style={{
                          background: COLORS.panel,
                          border: `1px solid ${
                            active === i ? t?.color || COLORS.signal : COLORS.line
                          }`,
                          borderLeft: `4px solid ${t?.color || COLORS.signal}`,
                          borderRadius: 4,
                          padding: "14px 18px",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 15, color: t?.color }}>
                            {t?.label || f.tell}
                          </span>
                          <span
                            style={{
                              fontSize: 14,
                              color: COLORS.inkSoft,
                              fontStyle: "italic",
                            }}
                          >
                            "{f.span}"
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            color: COLORS.ink,
                            marginTop: 6,
                            lineHeight: 1.5,
                          }}
                        >
                          {f.mechanism}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend of tells present */}
                {usedTells.length > 0 && (
                  <div
                    style={{
                      borderTop: `1px solid ${COLORS.line}`,
                      paddingTop: 18,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {usedTells.map((t) => (
                      <div key={t.id} style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 700, color: t.color }}>
                          {t.label}.
                        </span>{" "}
                        <span style={{ color: COLORS.inkSoft }}>{t.define}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <footer
          style={{
            marginTop: 48,
            fontSize: 12.5,
            color: COLORS.inkSoft,
            lineHeight: 1.6,
            borderTop: `1px solid ${COLORS.line}`,
            paddingTop: 18,
          }}
        >
          Fog Lifter teaches you to spot the tells, not to outsource your
          judgment. A flag is a prompt to look closer, not a ruling. Free, public,
          no account.
        </footer>
      </div>
    </div>
  );
}
