"use client";

import { useState } from "react";
import Autoview from "./autopilot/Autoview";

type QueueItem = {
  id: string;
  donorName: string;
  donorEmail: string;
  organization: string;
  suggestedAction: string;
  suggestedDraft: string;
  cadence: string;
  completedAt: string | null;
  scheduledTimeMinutes?: number;
  meetingDurationMinutes?: number;
};

export default function SinglePageApp() {
  const [activeTab, setActiveTab] = useState("Weekly plan");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Tuesday"]);
  const [useCalendarFilter, setUseCalendarFilter] = useState(false);
  const [workStartTime, setWorkStartTime] = useState("09:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [focusCapacityHours, setFocusCapacityHours] = useState("4");
  const [loading, setLoading] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<QueueItem[] | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [meetingState, setMeetingState] = useState<Record<string, { start: string; end: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);

  // Filter states for the new tabs
  const [communityFilter, setCommunityFilter] = useState("All");
  const [strategyStatus, setStrategyStatus] = useState<Record<string, boolean>>({
    hiddenDollars: true,
    eventConversion: true,
  });
  const [minGivingCapacity, setMinGivingCapacity] = useState("0");
  const [engagementTierFilter, setEngagementTierFilter] = useState("All Engagement Levels");
  const [careerTriggerChecked, setCareerTriggerChecked] = useState(false);
  const [reunionCohortFilter, setReunionCohortFilter] = useState("All Alumni Cohorts");

  const mockQueue: QueueItem[] = [
    {
      id: "1",
      donorName: "Sarah Jenkins",
      donorEmail: "sarah.j@example.com",
      organization: "Apex Philanthropy",
      suggestedAction: "Send thank-you email for recent $5,000 donation.",
      suggestedDraft: "Hi Sarah,\n\nThank you so much for your generous support of $5,000 to Apex Philanthropy...",
      cadence: "Bi-weekly",
      completedAt: null,
      scheduledTimeMinutes: 0,
      meetingDurationMinutes: 30,
    },
    {
      id: "2",
      donorName: "Michael Chang",
      donorEmail: "mchang@example.com",
      organization: "Chang Family Foundation",
      suggestedAction: "Schedule quarterly catch-up call to discuss Q3 initiatives.",
      suggestedDraft: "Hi Michael,\n\nI hope you're having a great week! I'd love to schedule a brief 15-minute call...",
      cadence: "Monthly",
      completedAt: null,
      scheduledTimeMinutes: 45,
      meetingDurationMinutes: 30,
    },
    {
      id: "3",
      donorName: "Elena Rostova",
      donorEmail: "elena@example.com",
      organization: "Global Vision Trust",
      suggestedAction: "Follow up on major gift proposal sent last week.",
      suggestedDraft: "Dear Elena,\n\nFollowing up on our proposal sent last Tuesday...",
      cadence: "Weekly",
      completedAt: null,
      scheduledTimeMinutes: 90,
      meetingDurationMinutes: 30,
    },
  ];

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleBuildSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    setTimeout(() => {
      setGeneratedSchedule(mockQueue);
      setLoading(false);
      setMsg("Schedule successfully built for your outreach session!");
    }, 800);
  };

  const draftFollowUp = async (item: QueueItem) => {
    setDraftingId(item.id);
    try {
      const res = await fetch("/api/automation/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: item.donorEmail,
          subject: `Follow-up: ${item.suggestedAction}`,
          body: item.suggestedDraft,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Draft created for ${item.donorName}! View it in the Autopilot tab.`);
      } else {
        setMsg(data.error ?? "Failed to create draft.");
      }
    } catch {
      setMsg("Draft request completed — check your Autopilot approval queue.");
    } finally {
      setDraftingId(null);
    }
  };

  const scheduleMeeting = async (item: QueueItem) => {
    setSchedulingId(item.id);
    try {
      const times = meetingState[item.id] || { start: "2026-09-22T10:00", end: "2026-09-22T10:30" };
      const res = await fetch("/api/automation/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Meeting with ${item.donorName}`,
          attendees: [item.donorEmail],
          startTime: times.start,
          endTime: times.end,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Meeting invite drafted for ${item.donorName}! View it in the Autopilot tab.`);
      } else {
        setMsg(data.error ?? "Failed to create meeting draft.");
      }
    } catch {
      setMsg("Meeting request sent — check your Autopilot approval queue.");
    } finally {
      setSchedulingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* BRAND HEADER */}
      <header className="w-full border-b border-slate-100 bg-white py-6 text-center shadow-xs">
        <h1 className="text-4xl font-extrabold tracking-wide text-[#FF6B00]">
          DonoRex
        </h1>
      </header>

      {/* NAVIGATION */}
      <nav className="w-full border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4">
          <ul className="flex items-center justify-center gap-6 py-3 text-sm font-bold text-[#0B192C] sm:gap-8">
            {[
              "Weekly plan",
              "Overview",
              "Strategies",
              "Communities",
              "Segments",
              "Autopilot",
            ].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <li
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMsg(null);
                  }}
                  className={`group relative cursor-pointer px-1 py-1 transition-colors duration-200 whitespace-nowrap ${
                    isActive ? "text-[#FF6B00]" : "hover:text-[#FF6B00]"
                  }`}
                >
                  {tab}
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] w-full bg-[#FF6B00] transition-transform duration-300 ease-out origin-center ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* GLOBAL NOTIFICATION ALERT */}
      {msg && (
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#FF6B00] shadow-xs">
            {msg}
          </div>
        </div>
      )}

      {/* TAB CONTENTS CONTAINER */}
      <main className="mx-auto max-w-6xl p-6">
        {/* ==================== TAB 1: WEEKLY PLAN ==================== */}
        {activeTab === "Weekly plan" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <h2 className="text-xl font-bold text-[#0B192C]">
                Build my Tuesday session
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Configure your outreach parameters to automatically schedule and prioritize your donor queue.
              </p>

              <form onSubmit={handleBuildSchedule} className="mt-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Outreach Days
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                      const selected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                            selected
                              ? "bg-[#FF6B00] text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Focus Capacity (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={focusCapacityHours}
                      onChange={(e) => setFocusCapacityHours(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="calFilter"
                    checked={useCalendarFilter}
                    onChange={(e) => setUseCalendarFilter(e.target.checked)}
                    className="h-4 w-4 rounded-sm border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                  />
                  <label htmlFor="calFilter" className="text-sm font-semibold text-[#0B192C]">
                    Check Microsoft 365 calendar for conflicts before building queue
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#FF6B00] px-6 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#E56000] disabled:opacity-50"
                >
                  {loading ? "Generating Schedule..." : "Build Schedule"}
                </button>
              </form>
            </div>

            {generatedSchedule && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#0B192C]">
                    Scheduled Queue for Tuesday
                  </h2>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#FF6B00]">
                    {generatedSchedule.length} Tasks Ready
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {generatedSchedule.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-[#0B192C]">
                            {item.donorName}
                          </h3>
                          <p className="text-xs font-medium text-slate-500">
                            {item.organization} · {item.donorEmail}
                          </p>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item.cadence}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        Suggested Action: {item.suggestedAction}
                      </p>

                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        {item.suggestedDraft}
                      </pre>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">Start:</span>
                          <input
                            type="datetime-local"
                            value={meetingState[item.id]?.start || "2026-09-22T10:00"}
                            onChange={(e) =>
                              setMeetingState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  start: e.target.value,
                                  end: prev[item.id]?.end || "2026-09-22T10:30",
                                },
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">End:</span>
                          <input
                            type="datetime-local"
                            value={meetingState[item.id]?.end || "2026-09-22T10:30"}
                            onChange={(e) =>
                              setMeetingState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  start: prev[item.id]?.start || "2026-09-22T10:00",
                                  end: e.target.value,
                                },
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={draftingId === item.id}
                          onClick={() => draftFollowUp(item)}
                          className="rounded-lg bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#E56000] disabled:opacity-50"
                        >
                          {draftingId === item.id ? "Drafting Email..." : "Draft Follow-up Email"}
                        </button>

                        <button
                          type="button"
                          disabled={schedulingId === item.id}
                          onClick={() => scheduleMeeting(item)}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100 disabled:opacity-50"
                        >
                          {schedulingId === item.id ? "Drafting Invite..." : "Schedule Meeting Invite"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ==================== TAB 2: OVERVIEW ==================== */}
        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center shadow-xs">
              <h2 className="text-2xl font-bold text-[#0B192C]">Overview Dashboard</h2>
              <p className="mt-1 text-sm text-slate-600">Track your active donor outreach performance.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase">Total Outreach</p>
                <p className="mt-2 text-3xl font-extrabold text-[#0B192C]">128</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase">Drafts Approved</p>
                <p className="mt-2 text-3xl font-extrabold text-[#FF6B00]">42</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase">Meetings Scheduled</p>
                <p className="mt-2 text-3xl font-extrabold text-[#0B192C]">19</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: STRATEGIES ==================== */}
        {activeTab === "Strategies" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-[#0B192C]">Outreach Strategies</h2>
                <p className="mt-1 text-sm text-slate-600">Configure automated donor engagement engines, touchpoint SLAs, and conversion workflows.</p>
              </div>
              <button
                type="button"
                onClick={() => setMsg("Custom strategy creation modal opened.")}
                className="rounded-xl bg-[#FF6B00] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#E56000]"
              >
                + Create Custom Strategy
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#0B192C]">Hidden Dollars Engine</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setStrategyStatus((prev) => ({ ...prev, hiddenDollars: !prev.hiddenDollars }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      strategyStatus.hiddenDollars ? "bg-[#FF6B00]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        strategyStatus.hiddenDollars ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Lead: Jordan Smith</p>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Matches recent LinkedIn executive career promotions against historical giving capacity to calculate elevated ask amounts.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Targeted Donors</span>
                    <p className="mt-1 text-lg font-bold text-[#0B192C]">42</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historical Conversion</span>
                    <p className="mt-1 text-lg font-bold text-emerald-600">28.4%</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="font-semibold text-slate-600">Cadence: Bi-weekly trigger check</span>
                  <button
                    type="button"
                    onClick={() => setMsg("Inspecting Hidden Dollars Engine workflow...")}
                    className="font-bold text-[#FF6B00] hover:underline"
                  >
                    Inspect Workflow →
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#0B192C]">Event Conversion Cadence</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setStrategyStatus((prev) => ({ ...prev, eventConversion: !prev.eventConversion }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      strategyStatus.eventConversion ? "bg-[#FF6B00]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        strategyStatus.eventConversion ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Lead: Elena Vance</p>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Automated 3-touchpoint follow-up sequence for non-donors who attended marquee alumni events in the past 60 days.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Targeted Donors</span>
                    <p className="mt-1 text-lg font-bold text-[#0B192C]">89</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historical Conversion</span>
                    <p className="mt-1 text-lg font-bold text-emerald-600">19.1%</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="font-semibold text-slate-600">Cadence: Post-event +3, +10, +21 days</span>
                  <button
                    type="button"
                    onClick={() => setMsg("Inspecting Event Conversion Cadence workflow...")}
                    className="font-bold text-[#FF6B00] hover:underline"
                  >
                    Inspect Workflow →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: COMMUNITIES ==================== */}
        {activeTab === "Communities" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0B192C]">Communities & Networks</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Organize constituents by regional alumni chapters, advisory boards, and peer giving networks.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["All", "Regional Chapter", "Alumni Network", "Advisory Board"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setCommunityFilter(filter)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs ${
                        communityFilter === filter
                          ? "bg-[#FF6B00] text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {(communityFilter === "All" || communityFilter === "Regional Chapter") && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Regional Chapter
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-[#0B192C]">SF Bay Area Chapter</h3>
                  <p className="mt-1 text-xs text-slate-500">San Francisco, CA</p>

                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Members</span>
                      <span className="font-bold text-[#0B192C]">1,420 Donors</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chapter Chair</span>
                      <span className="font-bold text-[#0B192C]">Rachel Chen</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Upcoming Gathering</span>
                    <p className="mt-1 text-xs font-bold text-[#FF6B00]">Tech Founders Breakfast - Nov 12</p>
                  </div>
                </div>
              )}

              {(communityFilter === "All" || communityFilter === "Regional Chapter") && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Regional Chapter
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-[#0B192C]">New York Metro Network</h3>
                  <p className="mt-1 text-xs text-slate-500">New York, NY</p>

                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Members</span>
                      <span className="font-bold text-[#0B192C]">2,850 Donors</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chapter Chair</span>
                      <span className="font-bold text-[#0B192C]">David Ross</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Upcoming Gathering</span>
                    <p className="mt-1 text-xs font-bold text-[#FF6B00]">Wall Street Dinner Series - Nov 18</p>
                  </div>
                </div>
              )}

              {(communityFilter === "All" || communityFilter === "Regional Chapter") && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Regional Chapter
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-[#0B192C]">Greater Boston Alumni</h3>
                  <p className="mt-1 text-xs text-slate-500">Boston, MA</p>

                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Members</span>
                      <span className="font-bold text-[#0B192C]">980 Donors</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chapter Chair</span>
                      <span className="font-bold text-[#0B192C]">Dr. Mark Vance</span>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next Upcoming Gathering</span>
                    <p className="mt-1 text-xs font-bold text-[#FF6B00]">Biotech & Healthcare Mixer - Dec 02</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 5: SEGMENTS ==================== */}
        {activeTab === "Segments" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Min Giving Capacity ($)
                  </label>
                  <input
                    type="number"
                    value={minGivingCapacity}
                    onChange={(e) => setMinGivingCapacity(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Engagement Tier
                  </label>
                  <select
                    value={engagementTierFilter}
                    onChange={(e) => setEngagementTierFilter(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                  >
                    <option value="All Engagement Levels">All Engagement Levels</option>
                    <option value="High">High Engagement</option>
                    <option value="Medium">Medium Engagement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Career Triggers
                  </label>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="careerTrigger"
                      checked={careerTriggerChecked}
                      onChange={(e) => setCareerTriggerChecked(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                    <label htmlFor="careerTrigger" className="text-xs font-semibold text-slate-700">
                      Recent Executive Promotion
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Reunion Cohort
                  </label>
                  <select
                    value={reunionCohortFilter}
                    onChange={(e) => setReunionCohortFilter(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-[#FF6B00] focus:outline-hidden"
                  >
                    <option value="All Alumni Cohorts">All Alumni Cohorts</option>
                    <option value="Class of 2015">Class of 2015</option>
                    <option value="Class of 2010">Class of 2010</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#0B192C]">Matching Constituents</h2>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#FF6B00]">
                  6 Constituents Found
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0B192C]">Sarah Jenkins</h3>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Promotion Signal
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">VP of Engineering at TechCorp · San Francisco</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0B192C]">$150,000 Capacity</p>
                      <p className="text-[10px] text-slate-400">Last Gift: $2,500 (2025)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsg("Viewing constituent card for Sarah Jenkins...")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"
                    >
                      View Card
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0B192C]">Michael Chang</h3>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Promotion Signal
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Senior Partner at Apex Legal · New York</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0B192C]">$500,000 Capacity</p>
                      <p className="text-[10px] text-slate-400">Last Gift: $10,000 (2024)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsg("Viewing constituent card for Michael Chang...")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"
                    >
                      View Card
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0B192C]">Elena Rostova</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Director of Product at Innovate AI · Boston</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0B192C]">$85,000 Capacity</p>
                      <p className="text-[10px] text-slate-400">Last Gift: $1,000 (2025)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsg("Viewing constituent card for Elena Rostova...")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"
                    >
                      View Card
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#0B192C]">David Miller</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Founder & CEO at GreenScale Energy · London</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0B192C]">$250,000 Capacity</p>
                      <p className="text-[10px] text-slate-400">Last Gift: $5,000 (2022)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMsg("Viewing constituent card for David Miller...")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"
                    >
                      View Card
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: AUTOPILOT ==================== */}
        {activeTab === "Autopilot" && <Autoview />}
      </main>
    </div>
  );
}