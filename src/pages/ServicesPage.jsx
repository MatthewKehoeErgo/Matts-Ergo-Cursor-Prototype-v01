import { DataRow, Panel, PageTitle, PlaceholderBlock } from "../components/Wireframe.jsx";
import grid from "./Pages.module.css";

const rows = [
  ["Enterprise support", "Active · renews Dec 2026", "Manage"],
  ["API access", "Trial · 14 days left", "Upgrade"],
  ["Backup & recovery", "Not configured", "Set up"],
];

export function ServicesPage() {
  return (
    <div>
      <PageTitle
        eyebrow="Catalog"
        title="Services"
        description="A wireframe table for subscriptions and add-ons. Swap copy and columns later without touching layout."
      />

      <Panel title="Your services">
        <div className={grid.tableHead} role="row">
          <div className={grid.th}>Service</div>
          <div className={grid.th}>Status</div>
          <div className={grid.th}>Action</div>
        </div>
        {rows.map((cells, i) => (
          <DataRow key={i} cells={cells} />
        ))}
      </Panel>

      <div className={grid.grid2}>
        <Panel title="Billing snapshot">
          <div className={grid.stack}>
            <PlaceholderBlock label="Next invoice date + amount" />
            <PlaceholderBlock label="Payment method" />
          </div>
        </Panel>
        <Panel title="Usage (example)">
          <PlaceholderBlock label="Metered usage chart / quota bars" tall />
        </Panel>
      </div>
    </div>
  );
}
