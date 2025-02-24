// MeetingFormatElements.js
const meetingFormats = [
  {
    id: 'general',
    title: t("General"),
    template: `【${t("Meeting Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda(1)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}
  【${t("Agenda(2)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}
  【${t("Agenda(3)")}】⚫︎${t("Discussion")}⚫︎${t("Decision items")}⚫︎${t("Pending problem")}・・・・（${t("Repeat the agenda items (4), (5), (6), and (7), if any, below.")}）・・`
  },
  {
    id: '1on1',
    title: t("1on1"),
    template: `【${t("Meeting Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda")}】（${t("Purpose & Key Points")}）
  【${t("Review")}】
  ⚫︎ ${t("Previous Initiatives (Achievements & Challenges)")}
  ⚫︎ ${t("Self-Assessment")}
  【${t("Feedback")}】
  ⚫︎ ${t("Strengths & Positive Points")}
  ⚫︎ ${t("Areas for Improvement & Growth Points")}
  【${t("Future Goals & Actions")}】
  ⚫︎ ${t("Specific Growth Plan")}
  ⚫︎ ${t("Support & Follow-up Actions")}`
  },
  {
    id: 'business-negotiation',
    title: t("Business negotiation"),
    template: `【${t("Deel Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda")}】（${t("Background, Purpose & Key Points")}）
  【${t("Discussion")}】
  ⚫︎ ${t("Proposal Details")}
  ⚫︎ ${t("Client’s Response / Requests & Concerns")}
  ⚫︎ ${t("Additional Confirmation Items")}
  【${t("Decision Items")}】
  ⚫︎ ${t("Agreed Points")}
  ⚫︎ ${t("Next Action Plan (Who, What, By When)")}
  【${t("Follow-up Actions")}】
  ⚫︎ ${t("Additional Actions Needed (e.g., Sending Documents, Internal Review, etc.)")}
  ⚫︎ ${t("Next Meeting Schedule")}`
  },
  {
    id: 'project-progress',
    title: t("Project Progress"),
    template: `【${t("Meeting Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda")}】（${t("Purpose & Key Points")}）
  【${t("Progress Report")}】
  ⚫︎ ${t("Current Progress Status")}
  ⚫︎ ${t("Recent Achievements")}
  【${t("Challenges & Risks")}】
  ⚫︎ ${t("Current Issues & Risks")}
  ⚫︎ ${t("Solutions & Countermeasures")}
  【${t("Upcoming Schedule")}】
  ⚫︎ ${t("Next Key Milestones")}
  ⚫︎ ${t("Who, What, By When")}`
  },
  {
    id: 'actual-progress',
    title: t("Actual Progress"),
    template: `【${t("Meeting Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda")}】（${t("Purpose & Key Points")}）
  【${t("Performance Report")}】
  ⚫︎ ${t("Target vs. Actual Performance")}
  ⚫︎ ${t("KPI Achievement Status")}
  【${t("Challenges & Improvements")}】
  ⚫︎ ${t("Successes & Challenges")}
  ⚫︎ ${t("Future Improvement Measures")}
  【${t("Action Plan")}】
  ⚫︎ ${t("Who, What, By When")}`
  },
  {
    id: 'brainstorming',
    title: t("brainstorming"),
    template: `【${t("Meeting Name")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Attendees")}】
  【${t("Agenda")}】（${t("Purpose & Key Points")}）
  【${t("Idea List")}】
  ⚫︎ ${t("Proposed Ideas")}
  ⚫︎ ${t("Pros & Cons of Each Idea")}
  【${t("Discussion")}】
  ⚫︎ ${t("Key Points & Considerations")}
  ⚫︎ ${t("Feasibility & Priority")}
  【${t("Next Actions")}】
  ⚫︎ ${t("Selected Ideas & Next Steps (Validation, Prototyping, etc.)")}
  ⚫︎ ${t("Who, What, By When")}`
  },
  {
    id: 'lecture',
    title: t("Lecture/Speech"),
    template: `【${t("Lecture Title")}】
  【${t("Date")}】
  【${t("Location")}】
  【${t("Speaker")}】
  【${t("Audience")}】
  【${t("Key Topics")}】
  ⚫︎ ${t("Main Subject & Purpose")}
  ⚫︎ ${t("Key Arguments & Supporting Points")}
  ⚫︎ ${t("Notable Quotes & Highlights")}
  【${t("Summary")}】
  ⚫︎ ${t("Key Takeaways")}
  ⚫︎ ${t("Impact & Implications")}
  【${t("Q&A / Feedback")}】
  ⚫︎ ${t("Key Questions from Audience")}
  ⚫︎ ${t("Responses & Additional Clarifications")}`
  }
];

export default meetingFormats;
