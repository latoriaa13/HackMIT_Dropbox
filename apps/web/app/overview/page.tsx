export function Overview() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header Banner */}
      <div className="border rounded-2xl p-8 text-center bg-card shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Overview Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track active donor outreach metrics, automation strategies, and key constituent segments.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outreach</p>
          <p className="text-4xl font-bold mt-2">128</p>
        </div>
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drafts Approved</p>
          <p className="text-4xl font-bold mt-2 text-orange-500">42</p>
        </div>
        <div className="border rounded-xl p-5 bg-card shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meetings Scheduled</p>
          <p className="text-4xl font-bold mt-2">19</p>
        </div>
      </div>

      {/* Merged Strategy & Segment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-6 bg-card shadow-sm">
          <h2 className="text-lg font-bold mb-3">Core Strategies</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><strong className="text-foreground">Hidden Dollars:</strong> Targets promoted alumni with stagnant ask amounts.</li>
            <li><strong className="text-foreground">Event Conversion:</strong> Converts event attendees into active donors.</li>
            <li><strong className="text-foreground">Follow-Up Engine:</strong> Prevents overdue interaction follow-ups.</li>
          </ul>
        </div>

        <div className="border rounded-xl p-6 bg-card shadow-sm">
          <h2 className="text-lg font-bold mb-3">Target Segments</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><strong className="text-foreground">Rising Stars:</strong> Recent executive promotions & high capacity.</li>
            <li><strong className="text-foreground">Engaged Non-Donors:</strong> High event attendance without FY26 gifts.</li>
            <li><strong className="text-foreground">Reunion Cohorts:</strong> 5-year milestone undergraduate alumni.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}