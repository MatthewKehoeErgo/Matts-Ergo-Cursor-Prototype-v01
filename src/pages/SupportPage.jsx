import { Panel, PageTitle, PlaceholderBlock } from "../components/Wireframe.jsx";
import grid from "./Pages.module.css";

export function SupportPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Help"
        title="Support"
        description="Ticket intake and self-service entry points. Buttons are non-functional in this prototype."
      />

      <div className={grid.grid2}>
        <Panel title="Contact options">
          <div className={grid.stack}>
            <button type="button" className={grid.primaryBtn}>
              Create support ticket
            </button>
            <button type="button" className={grid.secondaryBtn}>
              Request phone callback
            </button>
            <PlaceholderBlock label="SLA / hours of operation" />
          </div>
        </Panel>
        <Panel title="Your tickets">
          <div className={grid.stackTight}>
            <PlaceholderBlock label="Ticket list (open)" />
            <PlaceholderBlock label="Ticket list (closed)" />
          </div>
        </Panel>
      </div>

      <Panel title="Knowledge base">
        <div className={grid.grid3}>
          <PlaceholderBlock label="Article: onboarding" />
          <PlaceholderBlock label="Article: billing" />
          <PlaceholderBlock label="Article: security" />
        </div>
      </Panel>
    </div>
  );
}
