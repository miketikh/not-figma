# Feature Planning Document Template

## Instructions for AI

This is an **exploratory planning document**, not a formal PRD. Your goal is to:

- Help brainstorm possibilities and explore the feature space
- Identify potential user stories and implementation approaches
- Surface questions and considerations early
- Create a flexible foundation for discussion
- Avoid being overly prescriptive or locked into specific solutions

When the user describes a feature they want to add, use this template to generate a planning document that facilitates discussion.

---

# Feature Planning: [Feature Name]

**Date:** [Date]  
**Status:** Exploration Phase  
**Next Step:** Discussion → PRD Creation

## Feature Request Summary

_Brief 2-3 sentence description of what the user wants to add_

[AI: Restate the user's request in clear terms]

## Initial Questions & Clarifications

_Things we should discuss before diving deeper_

- **Question 1:** [Key question about scope, user needs, etc.]
- **Question 2:** [Technical constraints or preferences]
- **Question 3:** [Integration points or existing features]

[AI: Generate 3-5 questions that will help refine the direction]

## Possible User Stories

### Primary Use Cases

_The main ways users might interact with this feature_

1. **As a [user type], I want to [action] so that [benefit]**
   - Scenario: [Describe the situation]
   - Expected outcome: [What success looks like]

2. **As a [user type], I want to [action] so that [benefit]**
   - Scenario: [Describe the situation]
   - Expected outcome: [What success looks like]

[AI: Generate 3-5 primary user stories based on the feature request]

### Secondary/Future Use Cases

_Potential extensions or related features worth considering_

- [User story or use case]
- [User story or use case]

## Feature Possibilities

### Option A: [Approach Name]

**Description:** [High-level description of this approach]

**Pros:**

- [Benefit]
- [Benefit]

**Cons:**

- [Drawback]
- [Drawback]

**What we'd need:**

- [Technical requirement]
- [Resource or dependency]
- [Skill or knowledge]

### Option B: [Alternative Approach]

**Description:** [High-level description]

**Pros:**

- [Benefit]
- [Benefit]

**Cons:**

- [Drawback]
- [Drawback]

**What we'd need:**

- [Technical requirement]
- [Resource or dependency]

[AI: Generate 2-4 different implementation approaches, each with tradeoffs]

## Technical Considerations

### Architecture Thoughts

_High-level architectural implications_

- [Consideration about system design]
- [Consideration about scalability]
- [Consideration about data flow]

### Dependencies & Integrations

_What else in the app will this touch?_

- **Existing features affected:** [List features]
- **New dependencies needed:** [Libraries, APIs, services]
- **Data/state management:** [How will data flow?]

### Potential Challenges

_Things that might be tricky_

- **Challenge 1:** [Technical or design challenge]
  - Possible solutions: [Ideas for addressing it]
- **Challenge 2:** [Technical or design challenge]
  - Possible solutions: [Ideas for addressing it]

## User Experience Sketch

### User Flow Ideas

_Rough outline of how users might interact with this_

1. [Starting point]
2. [User action/step]
3. [System response]
4. [Next step]
5. [Completion]

### UI/UX Considerations

- **Interface elements needed:** [Buttons, forms, displays, etc.]
- **Feedback mechanisms:** [How will users know it's working?]
- **Error handling:** [What happens when things go wrong?]

## Open Questions & Discussion Points

### Decision Points

_Things we need to decide through discussion_

- [ ] **Decision 1:** [What needs to be decided]
  - Considerations: [Factors to think about]
- [ ] **Decision 2:** [What needs to be decided]
  - Considerations: [Factors to think about]

### Unknowns

_Things we need to research or learn more about_

- [Unknown factor]
- [Unknown factor]

### Trade-offs to Discuss

_Where we might need to balance competing priorities_

- [Trade-off 1]: [Description]
- [Trade-off 2]: [Description]

## Rough Implementation Thoughts

_Very high-level technical approach (details come later in PRD)_

### Core Components Needed

1. **[Component Name]**
   - Purpose: [What it does]
   - Rough approach: [General idea]

2. **[Component Name]**
   - Purpose: [What it does]
   - Rough approach: [General idea]

### Integration Points

- **Frontend:** [General areas affected]
- **Backend:** [General areas affected]
- **Database:** [General considerations]
- **APIs/Services:** [External or internal services]

## Success Criteria (Preliminary)

_How will we know this feature is successful?_

- [Measurable outcome]
- [Measurable outcome]
- [User feedback indicator]

## Next Steps

### Before Moving to PRD

- [ ] Discuss and decide on approach (Option A vs B vs hybrid)
- [ ] Answer open questions
- [ ] Validate assumptions about [specific assumptions]
- [ ] Sketch out [specific detail if needed]

### To Prepare for PRD Creation

- [Research or preparation task]
- [Research or preparation task]

---

## Discussion Notes

_Space to capture thoughts during the conversation_

[AI: Leave this section blank for the user to fill in, or populate during discussion]

---

## Transition to PRD

Once we've discussed and aligned on the approach, we'll create a formal PRD that includes:

- Structured requirements
- Phased implementation plan
- Specific code changes and files
- Detailed acceptance criteria
- Technical specifications
