# Pain Points

Feeds `roadmap-management` and `feature-spec`.

---

### Methodology: OTT without distance is misleading
**Frequency:** 4 mentions
**Severity:** reduces trust
**Quotes:**
- BOYLANATOR: "Off the Tee strokes gained without tracking distance is pointless. Sometimes I play with older golfers who hit twice the number of fairways I do but I have wedge in out of light rough while they have 7 wood and can't reach the green. There's no way they are gaining shots off the tee on me." (4 upvotes)
- BOYLANATOR (follow-up): "I put in my last round and gained shots on approach and lost shots on driving but really I think thats because I hit it far and had shorter approaches out of the rough."
- DontStalkMeNow (1.2 hcp): "To me, the problem with it being transferred to another category is that you lose insight into which area of your game you need to improve and ultimately skewers your decision making."
- Anonymous: "I once had a round where I hit literally 0 fairways(technically), but I drove the ball very well. I had a wedge in from light rough on a ton of holes, and also drove the green on 1 par 4. This SG calculator would say I lost a ton of strokes against my handicap, when I probably gained a ton of strokes against my handicap."
**Current mitigation:** None. OTT is currently evaluated purely on fairway hit rate and GIR contribution.
**Potential fix:** Add optional approach distance input to separate driving distance from accuracy. Could also add a tooltip explaining the limitation and what OTT measures in the current version. Consider course-context factor: narrow fairways with benign rough penalize differently than wide fairways with hazard rough — binary fairway hit/miss loses this nuance.

---

### Methodology: Category cross-contamination (OTT leaking into approach)
**Frequency:** 2 mentions
**Severity:** reduces trust
**Quotes:**
- BOYLANATOR: "I hit it far and had shorter approaches out of the rough... gained shots on approach and lost shots on driving but really I think thats because I hit it far."
- DontStalkMeNow: "The problem with it being transferred to another category is that you lose insight into which area of your game you need to improve and ultimately skewers your decision making."
**Current mitigation:** None. Stats-based approach inherently conflates driving distance with approach skill since GIR rate is influenced by both.
**Potential fix:** Approach distance self-reporting (see feature request). Alternatively, weight approach SG by par distribution to partially decouple -- par 5 approach is less distance-dependent than par 4.
