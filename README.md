# Fog Lifter

A free public tool that detects manipulation and fabrication tells in a passage of text. It names the rhetorical move, marks the exact span that triggered it, and explains in one plain sentence what that move is doing to the reader.

Fog Lifter does not adjudicate true or false. That is the design line, not a limitation. A veil only lightly obscures; fog distorts and confuses. The tool teaches you to see the distortion mechanism so your own judgment gets sharper, instead of outsourcing the verdict to a machine.

## What v1 does

One mode. Paste text, lift the fog, read the flags. That is the entire surface.

- Input: any paragraph from an article, post, ad, or speech.
- Output: the source text with flagged spans highlighted and color coded by tell type, a list of every tell found with its mechanism, and a legend defining the tell types present.
- Engine: one Anthropic API call running a fixed taxonomy.

## What v1 deliberately does NOT do

These are v2, not sprint fuel. Held out on purpose so v1 ships in two weeks:

- Speaker attribution
- Valence scoring
- Comparative mode (two passages side by side)
- The investigation-as-verdict fallacy
- Accounts, history, saved analyses

## The taxonomy is the product

During methodology testing, the thing you iterate on is the tell set and the analysis prompt, not the UI. Both live at the top of `src/App.jsx`, inside the clearly marked METHODOLOGY-TESTING ZONE:

- `TELLS` is the fixed v1 taxonomy: id, display label, highlight color, and the plain-language definition.
- `buildSystemPrompt()` assembles the analysis instruction from that taxonomy and pins the JSON output contract.

Add, cut, or reword a tell in one place and the highlighter, the flag list, and the legend all update from it. To run a new methodology pass, edit `TELLS`, reload, run the same test passages, and compare what gets flagged.

v1 ships with ten tells: loaded language, vague or unfalsifiable, false urgency, fear or outrage hook, strawman, anecdote as proof, false binary, unsourced authority, manufactured consensus, and deflection or whataboutism.

## Run it locally

```bash
npm install
npm run dev
```

## The one thing to fix before public launch

`src/App.jsx` calls the Anthropic API directly from the browser. That works inside a sandboxed preview, but a real public deploy must NOT ship an API key to the client, because anyone can read it and burn your quota. Before launch, move the API call behind a thin server proxy that holds the key and exposes a single `/analyze` endpoint. The front end then calls your endpoint instead of `api.anthropic.com`. On Supabase this is an Edge Function; that is the recommended path since DN already runs on Supabase.

## Lovable port

The whole tool is one self-contained component (`App.jsx`), so the port is mechanical:

1. Spin up a Lovable React project.
2. Drop in the `App` component as the page.
3. Replace the direct `fetch` to `api.anthropic.com` with a call to your Supabase Edge Function (see above).
4. Keep `TELLS` and `buildSystemPrompt` exactly as they are. They are framework agnostic.

The inline style objects are intentional, so the component carries its own look with no Tailwind config or external CSS to wire up. Once it is stable you can migrate them to Tailwind in Lovable if you want, but it is not required to ship.

## Layer placement

Fog Lifter is the public, accessible distillation of the AFD framework into a literacy tool against the manipulation layer of subscription capture. Free, no account, public. It sits in the apps layer under Peregrine Frontiers, distinct from the Little Bird editorial voice and the Dissidents Network factual architecture.
