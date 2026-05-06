import { Panel, PageTitle, PlaceholderBlock } from "../components/Wireframe.jsx";
import grid from "./Pages.module.css";

export function DashboardPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Overview"
        title="Dashboard"
        description="High-level status for your account. Replace placeholders with real widgets as the design firms up."
      />

      <div className={grid.grid2}>
        <Panel title="Open items">
          <div className={grid.stack}>
            <PlaceholderBlock label="Chart / KPI strip" tall />
            <PlaceholderBlock label="Recent activity list" />
          </div>
        </Panel>
        <Panel title="Announcements">
          <div className={grid.stack}>
            <PlaceholderBlock label="Banner / maintenance notice" />
            <PlaceholderBlock label="Links to docs or policy updates" />
          </div>
        </Panel>
      </div>

      <Panel title="Shortcuts">
        <div className={grid.grid3}>
          <PlaceholderBlock label="Pay invoice" />
          <PlaceholderBlock label="Open ticket" />
          <PlaceholderBlock label="Download statement" />
        </div>
      </Panel>
    </div>
  );
}
