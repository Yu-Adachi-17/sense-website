// src/components/slideaipro/slidePages/index.js
import CoverPage from "./CoverPage";
import ProblemPage from "./ProblemPage";
import ProposalPage from "./ProposalPage";
import EffectsPage from "./EffectsPage";
import BarPage from "./BarPage";
import TasksPage from "./TasksPage";
import UnknownPage from "./UnknownPage";

export const slidePageRenderers = {
  cover: CoverPage,
  problem: ProblemPage,     // ← ここを分離
  proposal: ProposalPage,   // ← ここを分離
  effects: EffectsPage,
  bar: BarPage,
  tasks: TasksPage,
  unknown: UnknownPage,
};
