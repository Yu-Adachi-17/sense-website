// src/components/slideaipro/slidePages/index.js
import CoverPage from "./CoverPage";
import ProblemProposalPage from "./ProblemProposalPage";
import EffectsPage from "./EffectsPage";
import BarPage from "./BarPage";
import TasksPage from "./TasksPage";

export const slidePageRenderers = {
  cover: CoverPage,
  problem: ProblemProposalPage,
  proposal: ProblemProposalPage,
  effects: EffectsPage,
  bar: BarPage,
  tasks: TasksPage,
};
