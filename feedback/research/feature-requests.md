# Feature Requests

Feeds `feature-spec` and `roadmap-management` (RICE/ICE scoring).

---

### Request: Self-report approach distances
**Frequency:** 4 mentions
**Source users:** Candymanshook, BOYLANATOR (raised the OTT issue but noted he "probably wouldn't want to enter estimated distances for every shot"), Anonymous (0/14 fairways but excellent driving — course has narrow fairways with light rough)
**Verbatim:** "A potential here might be allowing users to self-report approach distances? It's a lot easier than having them input drive distance since you just would have to laser the green from your ball, not your ball from the tee box." — Candymanshook
**Problem it solves:** Without distance context, OTT and approach categories cross-contaminate. A 250-yard drive that leaves 180 in vs a 280-yard drive that leaves 150 in look identical in current stats. Adding approach distance lets the tool separate driving distance contribution from approach skill.
**UX insight:** Approach distance is easier to capture than drive distance — golfers already laser the green from their ball, but measuring drive distance requires measuring from tee box to ball.
**Complexity estimate:** medium
**Counter-signal:** BOYLANATOR: "You would need shot tracking but that's a whole extra layer of detail and I probably wouldn't want to enter estimated distances for every shot. So what you have is good."
**Dependencies:** New input field in round entry form; updated benchmark data segmented by approach distance; recalculation of SG approach to account for distance-to-pin
