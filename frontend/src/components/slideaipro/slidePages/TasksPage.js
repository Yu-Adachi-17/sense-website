// src/components/slideaipro/slidePages/TasksPage.js
import React from "react";
import SlidePageFrame from "./SlidePageFrame";

export default function TasksPage({ slide, pageNo, isIntelMode, hasPrefetched }) {
  const rows = Array.isArray(slide.rows) ? slide.rows : [];

  return (
    <SlidePageFrame pageNo={pageNo} isIntelMode={isIntelMode} hasPrefetched={hasPrefetched} footerRight="">
      <div className="h1">{slide.title}</div>

      <div className="tableWrap">
        <table className="taskTable">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assignee</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${slide.id}-t-${i}`}>
                <td>{r.title}</td>
                <td>{r.assignee}</td>
                <td>{r.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlidePageFrame>
  );
}
