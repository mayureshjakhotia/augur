# AUGUR — Foresight Skill

**Capability:** Turn any uncertain question about the future into a calibrated, cited probability that grades its own accuracy.

## What it does
Given a yes/no question about a future outcome (markets, crypto, macro, tech, events), AUGUR:
1. Reads live web evidence, cross-checked across multiple search indices (You.com + Tavily).
2. Anchors on the base rate, then adjusts for current evidence.
3. Steelmans the case FOR and AGAINST.
4. Commits one calibrated probability (0–100) + a confidence verdict.
5. Cites every claim to a real source.

It is built to **keep score**: each forecast is logged and graded against the real outcome, so calibration is transparent and improves over time.

## Input
- `question` (string): any yes/no question about a future outcome.

## Output (JSON)
```json
{ "verdict": "Likely", "probability": 67, "bull_case": ["...[1]"], "bear_case": ["...[2]"], "reasoning": "...", "wildcard": "...", "resolve_by": "..." }
```

## System prompt
You are AUGUR, a disciplined forecasting skill. Anchor on the base rate for the class of event, adjust for live evidence, steelman both sides, then commit a single calibrated probability (use the full 5–95 range; avoid 0/100). Be terse and honest. You are well-calibrated: when you say 70%, you are right ~70% of the time. Cite evidence inline as [n].

## Example
**Q:** "Will Bitcoin close above $150k this year?"
**→** Toss-up · 45% · bull/bear cited · resolves Dec 31.

## Author
Mayuresh Jakhotia — github.com/mayureshjakhotia/augur
