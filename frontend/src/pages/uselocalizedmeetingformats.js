import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

const defaultMeetingFormats = [
  {
    id: 'general',
    titleKey: "General",
    templateKey: `【{Meeting Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda(1)}】⚫︎{Discussion}⚫︎{Decision items}⚫︎{Pending problem}
【{Agenda(2)}】⚫︎{Discussion}⚫︎{Decision items}⚫︎{Pending problem}
【{Agenda(3)}】⚫︎{Discussion}⚫︎{Decision items}⚫︎{Pending problem}・・・・（{Repeat the agenda items (4), (5), (6), and (7), if any, below.}）・・`
  },
  {
    id: '1on1',
    titleKey: "1on1",
    templateKey: `【{Meeting Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda}】（{Purpose & Key Points}）
【{Review}】
⚫︎ {Previous Initiatives (Achievements & Challenges)}
⚫︎ {Self-Assessment}
【{Feedback}】
⚫︎ {Strengths & Positive Points}
⚫︎ {Areas for Improvement & Growth Points}
【{Future Goals & Actions}】
⚫︎ {Specific Growth Plan}
⚫︎ {Support & Follow-up Actions}`
  },
  {
    id: 'business-negotiation',
    titleKey: "Business negotiation",
    templateKey: `【{Deel Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda}】（{Background, Purpose & Key Points}）
【{Discussion}】
⚫︎ {Proposal Details}
⚫︎ {Client’s Response / Requests & Concerns}
⚫︎ {Additional Confirmation Items}
【{Decision Items}】
⚫︎ {Agreed Points}
⚫︎ {Next Action Plan (Who, What, By When)}
【{Follow-up Actions}】
⚫︎ {Additional Actions Needed (e.g., Sending Documents, Internal Review, etc.)}
⚫︎ {Next Meeting Schedule}`
  },
  {
    id: 'project-progress',
    titleKey: "Project Progress",
    templateKey: `【{Meeting Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda}】（{Purpose & Key Points}）
【{Progress Report}】
⚫︎ {Current Progress Status}
⚫︎ {Recent Achievements}
【{Challenges & Risks}】
⚫︎ {Current Issues & Risks}
⚫︎ {Solutions & Countermeasures}
【{Upcoming Schedule}】
⚫︎ {Next Key Milestones}
⚫︎ {Who, What, By When}`
  },
  {
    id: 'actual-progress',
    titleKey: "Actual Progress",
    templateKey: `【{Meeting Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda}】（{Purpose & Key Points}）
【{Performance Report}】
⚫︎ {Target vs. Actual Performance}
⚫︎ {KPI Achievement Status}
【{Challenges & Improvements}】
⚫︎ {Successes & Challenges}
⚫︎ {Future Improvement Measures}
【{Action Plan}】
⚫︎ {Who, What, By When}`
  },
  {
    id: 'brainstorming',
    titleKey: "brainstorming",
    templateKey: `【{Meeting Name}】
【{Date}】
【{Location}】
【{Attendees}】
【{Agenda}】（{Purpose & Key Points}）
【{Idea List}】
⚫︎ {Proposed Ideas}
⚫︎ {Pros & Cons of Each Idea}
【{Discussion}】
⚫︎ {Key Points & Considerations}
⚫︎ {Feasibility & Priority}
【{Next Actions}】
⚫︎ {Selected Ideas & Next Steps (Validation, Prototyping, etc.)}
⚫︎ {Who, What, By When}`
  },
  {
    id: 'lecture',
    titleKey: "Lecture/Speech",
    templateKey: `【{Lecture Title}】
【{Date}】
【{Location}】
【{Speaker}】
【{Audience}】
【{Key Topics}】
⚫︎ {Main Subject & Purpose}
⚫︎ {Key Arguments & Supporting Points}
⚫︎ {Notable Quotes & Highlights}
【{Summary}】
⚫︎ {Key Takeaways}
⚫︎ {Impact & Implications}
【{Q&A / Feedback}】
⚫︎ {Key Questions from Audience}
⚫︎ {Responses & Additional Clarifications}`
  }
];


// **ローカライズ処理**
const localizeFormat = (format, t) => ({
    id: format.id,
    title: t(format.titleKey),
    template: format.templateKey.replace(/{([^}]+)}/g, (_, key) => t(key)),
    titleKey: format.titleKey,
    templateKey: format.templateKey
  });
  
  // **カスタムフック**
  const useLocalizedMeetingFormats = () => {
    const { t } = useTranslation();
    const [localizedFormats, setLocalizedFormats] = useState([]);
  
    useEffect(() => {
      setLocalizedFormats(defaultMeetingFormats.map(format => localizeFormat(format, t)));
    }, [t]); // `t` が変更された場合に再実行
  
    return localizedFormats;
  };
  
  export default useLocalizedMeetingFormats;