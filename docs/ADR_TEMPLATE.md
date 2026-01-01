# Architecture Decision Record Template

Use this template when documenting significant architectural decisions.

---

## ADR-XXXX: [Short, Descriptive Title]

**Status:** [Proposed | Accepted | Deprecated | Superseded]  
**Date:** YYYY-MM-DD  
**Deciders:** [Names of people involved in decision]  
**Tags:** [relevant, tags, here]

---

## Context

**What is the problem or opportunity?**

Describe the context and background that led to this decision. Include:
- What challenge or requirement triggered this decision?
- What constraints exist (technical, business, timeline, budget)?
- What alternatives were considered?
- Why does this decision matter?

Be specific about the problem, not the solution. The reader should understand WHY a decision was needed before learning WHAT was decided.

---

## Decision

**What did we decide?**

State the decision clearly and concisely. This should be a definitive statement of what was chosen.

Example: "We will use MongoDB as our primary database."

Include key implementation details:
- What specific technology/approach was chosen?
- How will it be implemented?
- What are the key configuration or setup requirements?

---

## Rationale

**Why did we make this decision?**

Explain the reasoning behind the decision. Include:
- What factors were most important?
- How does this align with project goals?
- What problems does this solve?
- Why is this better than alternatives?

Be honest about trade-offs. No decision is perfect—acknowledge weaknesses while explaining why the benefits outweigh them.

---

## Consequences

### Positive
- **[Benefit 1]:** Description of positive outcome
- **[Benefit 2]:** Description of positive outcome
- **[Benefit 3]:** Description of positive outcome

### Negative
- **[Drawback 1]:** Description of negative consequence and mitigation (if any)
- **[Drawback 2]:** Description of negative consequence and mitigation (if any)

### Neutral
- **[Impact 1]:** Description of other impacts (neither clearly positive nor negative)
- **[Impact 2]:** Description of other impacts

---

## Alternatives Considered

### Alternative 1: [Name]

**Description:** Brief description of this alternative

**Pros:**
- Advantage 1
- Advantage 2

**Cons:**
- Disadvantage 1
- Disadvantage 2

**Why Rejected:** Specific reason this wasn't chosen

---

### Alternative 2: [Name]

**Description:** Brief description of this alternative

**Pros:**
- Advantage 1
- Advantage 2

**Cons:**
- Disadvantage 1
- Disadvantage 2

**Why Rejected:** Specific reason this wasn't chosen

---

## Implementation Notes

**Practical guidance for implementing this decision:**

- Key files or modules affected
- Configuration requirements
- Dependencies to install
- Migration steps (if applicable)
- Testing considerations
- Rollout plan

---

## Validation

**How will we know if this decision was correct?**

Define success criteria:
- What metrics will we track?
- What problems should be solved?
- When will we review this decision?
- What would trigger reconsidering?

---

## References

**Related documentation, discussions, or resources:**

- [Link to spike/prototype]
- [Link to RFC or proposal]
- [Link to related ADR-XXXX]
- [External documentation]
- [Benchmark results]
- [Team discussion thread]

---

## Notes

**Additional context or future considerations:**

- Related decisions pending
- Known limitations or technical debt
- Future improvements planned
- Lessons learned from implementation

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | [Name] | Initial decision |
| YYYY-MM-DD | [Name] | Updated based on implementation experience |

---

**Template Version:** 1.0  
**Last Updated:** 2025-12-31
