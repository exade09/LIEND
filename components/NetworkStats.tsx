import { project } from "@/config/project";

const stats = [
  "Total Borrowed",
  "Active Positions",
  "Supported Markets",
  "Transactions",
] as const;

export function NetworkStats() {
  return (
    <section className="network-stats" aria-labelledby="network-stats-title">
      <div className="network-stats__status">
        <span className="network-stats__status-dot" aria-hidden="true" />
        <div>
          <h2 id="network-stats-title">NETWORK STATUS</h2>
          <p>
            {project.network} <span aria-hidden="true">{"\u2022"}</span>{" "}
            {project.status}
          </p>
        </div>
      </div>

      <dl className="network-stats__grid">
        {stats.map((label) => (
          <div className="network-stats__item" key={label}>
            <dt>{label}</dt>
            <dd aria-label={`${label} unavailable`}>--</dd>
          </div>
        ))}
      </dl>

      <p className="network-stats__note">Awaiting live protocol data</p>
    </section>
  );
}
