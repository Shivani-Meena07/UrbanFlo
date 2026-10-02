import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useApp } from "../../state/AppContext";
import { cityData } from "../../data/mockData";
import {
  CitizenReport,
  getCitizenReports,
  verifyCitizenReport,
  updateCitizenReportStatus,
} from "../../data/api";

type IncidentStatus =
  | "Under verification"
  | "Verified"
  | "Assigned"
  | "Resolved";

type IncidentSeverity = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

type AuthorityIncident = {
  reportId: number;
  id: string;
  title: string;
  description: string;
  location: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedAt: string;
  source: "Citizen";
  assignedTeam?: string;
  modelRelevant: boolean;
};

const severityConfig: Record<
  IncidentSeverity,
  {
    label: string;
    text: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  CRITICAL: {
    label: "Critical",
    text: "text-red-800",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-600",
  },
  HIGH: {
    label: "High",
    text: "text-orange-800",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  MODERATE: {
    label: "Moderate",
    text: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    text: "text-green-800",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-600",
  },
};

const statusConfig: Record<
  IncidentStatus,
  {
    label: string;
    text: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  "Under verification": {
    label: "Verification",
    text: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  Verified: {
    label: "Verified",
    text: "text-blue-800",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  Assigned: {
    label: "Assigned",
    text: "text-orange-800",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  Resolved: {
    label: "Resolved",
    text: "text-green-800",
    bg: "bg-green-50",
    border: "border-green-200",
    dot: "bg-green-600",
  },
};

function normalizeSeverity(value: string): IncidentSeverity {
  switch (value.toUpperCase()) {
    case "CRITICAL":
      return "CRITICAL";

    case "HIGH":
      return "HIGH";

    case "MODERATE":
    case "MEDIUM":
      return "MODERATE";

    case "LOW":
      return "LOW";

    default:
      return "LOW";
  }
}

function normalizeStatus(value: string): IncidentStatus {
  switch (value.toLowerCase()) {
    case "confirmed":
      return "Verified";

    case "assigned":
      return "Assigned";

    case "resolved":
    case "closed":
      return "Resolved";

    case "rejected":
      return "Resolved";

    case "under verification":
    default:
      return "Under verification";
  }
}

function issueTitle(issueType: string): string {
  switch (issueType) {
    case "Blocked Drain":
      return "Possible blocked drainage inlet";

    case "Waterlogging":
      return "Waterlogging reported";

    case "Drain Overflow":
      return "Drain overflow reported";

    case "Damaged Drain":
      return "Damaged drainage infrastructure";

    default:
      return "Citizen flood observation";
  }
}

function formatReportedAt(createdAt: string): string {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapReportToIncident(
  report: CitizenReport,
): AuthorityIncident {
  return {
    reportId: report.id,
    id: `IN-${String(report.id).padStart(4, "0")}`,
    title: issueTitle(report.issue_type),
    description:
      report.description ||
      "No additional description was provided by the citizen.",
    location: report.location,
    severity: normalizeSeverity(report.severity),
    status: normalizeStatus(report.status),
    reportedAt: formatReportedAt(report.created_at),
    source: "Citizen",
    assignedTeam: report.assigned_team ?? undefined,
    modelRelevant: report.model_relevant,
  };
}

function SeverityBadge({
  severity,
}: {
  severity: IncidentSeverity;
}) {
  const config = severityConfig[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] font-semibold ${config.bg} ${config.border} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />
      {config.label}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: IncidentStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] font-semibold ${config.bg} ${config.border} ${config.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
      />
      {config.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  alert = false,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      className={`border bg-white p-4 ${
        alert
          ? "border-red-200"
          : "border-warm-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center ${
            alert
              ? "bg-red-50 text-red-700"
              : "bg-warm-100 text-warm-600"
          }`}
        >
          {icon}
        </div>

        {alert && (
          <span className="mt-1 h-2 w-2 rounded-full bg-red-600" />
        )}
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-warm-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-warm-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-warm-500">
        {detail}
      </p>
    </div>
  );
}

function IncidentCard({
  incident,
  onSelect,
}: {
  incident: AuthorityIncident;
  onSelect: () => void;
}) {
  const isCritical =
    incident.severity === "CRITICAL" &&
    incident.status !== "Resolved";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full border-b border-warm-200 px-4 py-4 text-left transition hover:bg-warm-50 sm:px-5 ${
        isCritical
          ? "border-l-2 border-l-red-600"
          : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-medium text-warm-400">
              {incident.id}
            </span>

            <SeverityBadge
              severity={incident.severity}
            />

            <StatusBadge status={incident.status} />

            {incident.modelRelevant && (
              <span className="inline-flex items-center gap-1 border border-maroon-200 bg-maroon-50 px-2 py-1 text-[11px] font-semibold text-maroon-700">
                <FileCheck2 className="h-3 w-3" />
                Model relevant
              </span>
            )}
          </div>

          <h3 className="mt-3 text-sm font-bold text-warm-900 sm:text-base">
            {incident.title}
          </h3>

          <p className="mt-1 max-w-3xl text-sm leading-5 text-warm-600">
            {incident.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-warm-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {incident.location}
            </span>

            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {incident.reportedAt}
            </span>

            <span>
              Source: {incident.source}
            </span>

            {incident.assignedTeam && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {incident.assignedTeam}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-maroon-700">
          Review
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      </div>
    </button>
  );
}

function IncidentDetailPanel({
  incident,
  onClose,
  onUpdated,
}: {
  incident: AuthorityIncident;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [team, setTeam] = useState(
    incident.assignedTeam ?? "",
  );

  const [modelRelevant, setModelRelevant] =
    useState(incident.modelRelevant);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [currentStatus, setCurrentStatus] =
    useState<IncidentStatus>(incident.status);

  const saveUpdate = async () => {
    setSaving(true);
    setError("");

    try {
      /*
       * Verification endpoint controls whether the report is
       * confirmed/rejected, model relevance and team assignment.
       */
      if (
        currentStatus === "Verified" ||
        currentStatus === "Assigned"
      ) {
        await verifyCitizenReport(
          incident.reportId,
          {
            verified: true,
            model_relevant: modelRelevant,
            assigned_team: team || null,
          },
        );
      }

      /*
       * Once verified, operational status can move through
       * Assigned / Resolved.
       */
      if (
        currentStatus === "Assigned" ||
        currentStatus === "Resolved"
      ) {
        await updateCitizenReportStatus(
          incident.reportId,
          currentStatus,
        );
      }

      await onUpdated();
      onClose();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to save the operational update.",
      );
    } finally {
      setSaving(false);
    }
  };

  const rejectReport = async () => {
    setSaving(true);
    setError("");

    try {
      await verifyCitizenReport(
        incident.reportId,
        {
          verified: false,
          model_relevant: false,
          assigned_team: null,
        },
      );

      await onUpdated();
      onClose();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to reject the report.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-3000 flex items-end justify-center bg-black/40 sm:items-center sm:p-5">
      <div className="flex max-h-[94vh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-2xl sm:border sm:border-warm-200">
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-warm-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-maroon-600" />

              <p className="text-[10px] font-bold uppercase tracking-widest text-maroon-700">
                Incident review
              </p>
            </div>

            <h2 className="mt-1 font-mono text-lg font-bold text-warm-900">
              {incident.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center border border-warm-200 text-lg text-warm-500 transition hover:bg-warm-100 disabled:opacity-50"
            aria-label="Close incident"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto">
          <div className="space-y-5 p-5">
            {/* Incident overview */}
            <section>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge
                  severity={incident.severity}
                />

                <StatusBadge
                  status={currentStatus}
                />

                {modelRelevant && (
                  <span className="inline-flex items-center gap-1 border border-maroon-200 bg-maroon-50 px-2 py-1 text-[11px] font-semibold text-maroon-700">
                    <FileCheck2 className="h-3 w-3" />
                    Model relevant
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-lg font-bold text-warm-900">
                {incident.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-warm-600">
                {incident.description}
              </p>
            </section>

            {/* Metadata */}
            <section className="grid border border-warm-200 sm:grid-cols-2">
              <div className="border-b border-warm-200 p-4 sm:border-r">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">
                  Location
                </p>

                <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-warm-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-maroon-600" />
                  {incident.location}
                </p>
              </div>

              <div className="border-b border-warm-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">
                  Reported
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-warm-800">
                  <Clock3 className="h-4 w-4 text-warm-500" />
                  {incident.reportedAt}
                </p>
              </div>

              <div className="border-b border-warm-200 p-4 sm:border-b-0 sm:border-r">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">
                  Source
                </p>

                <p className="mt-2 text-sm font-semibold text-warm-800">
                  Citizen report
                </p>
              </div>

              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-warm-400">
                  Report ID
                </p>

                <p className="mt-2 font-mono text-sm font-semibold text-warm-800">
                  #{incident.reportId}
                </p>
              </div>
            </section>

            {/* Verification / response */}
            <section className="border-t border-warm-200 pt-5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-maroon-700" />

                <h3 className="text-sm font-bold text-warm-900">
                  Verification & response
                </h3>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-warm-700">
                    Incident status
                  </span>

                  <select
                    value={currentStatus}
                    onChange={(event) =>
                      setCurrentStatus(
                        event.target
                          .value as IncidentStatus,
                      )
                    }
                    disabled={saving}
                    className="mt-2 w-full border border-warm-300 bg-white px-3 py-3 text-sm text-warm-800 outline-none transition focus:border-maroon-600 focus:ring-1 focus:ring-maroon-200 disabled:bg-warm-100"
                  >
                    <option value="Under verification">
                      Under verification
                    </option>

                    <option value="Verified">
                      Verified
                    </option>

                    <option value="Assigned">
                      Assigned
                    </option>

                    <option value="Resolved">
                      Resolved
                    </option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-warm-700">
                    Response team
                  </span>

                  <select
                    value={team}
                    onChange={(event) =>
                      setTeam(event.target.value)
                    }
                    disabled={saving}
                    className="mt-2 w-full border border-warm-300 bg-white px-3 py-3 text-sm text-warm-800 outline-none transition focus:border-maroon-600 focus:ring-1 focus:ring-maroon-200 disabled:bg-warm-100"
                  >
                    <option value="">
                      Not assigned
                    </option>

                    <option value="Drainage Response Team">
                      Drainage Response Team
                    </option>

                    <option value="Field Inspection Team">
                      Field Inspection Team
                    </option>

                    <option value="Emergency Response Team">
                      Emergency Response Team
                    </option>

                    <option value="Traffic Management Team">
                      Traffic Management Team
                    </option>
                  </select>
                </label>

                <label className="flex cursor-pointer items-start gap-3 border border-maroon-200 bg-maroon-50 p-4">
                  <input
                    type="checkbox"
                    checked={modelRelevant}
                    onChange={(event) =>
                      setModelRelevant(
                        event.target.checked,
                      )
                    }
                    disabled={saving}
                    className="mt-1 h-4 w-4 accent-maroon-600"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-maroon-800">
                      Mark as model-relevant
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-maroon-700">
                      Use verified observations as evidence
                      about drainage, water accumulation or
                      infrastructure condition.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* Model feedback */}
            <section className="border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
                    Model feedback loop
                  </p>

                  <p className="mt-2 text-sm leading-5 text-amber-800">
                    Marking a report as model-relevant persists
                    that operational decision in the backend.
                    The current prototype does not
                    automatically modify or recalibrate the
                    SWMM model from this action.
                  </p>
                </div>
              </div>
            </section>

            {/* Error */}
            {error && (
              <section className="border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

                  <div>
                    <p className="text-sm font-bold text-red-900">
                      Update failed
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="shrink-0 border-t border-warm-200 bg-white p-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={rejectReport}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />

              {saving
                ? "Saving..."
                : "Reject report"}
            </button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="border border-warm-300 px-4 py-2.5 text-xs font-semibold text-warm-700 transition hover:bg-warm-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUpdate}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-maroon-700 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-maroon-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save operational update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthorityIncidentsScreen() {
  const { state } = useApp();

  const city = cityData[state.city];

  const [reports, setReports] = useState<
    CitizenReport[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [filter, setFilter] = useState<
    "ALL" | IncidentStatus
  >("ALL");

  const [selectedIncident, setSelectedIncident] =
    useState<AuthorityIncident | null>(null);

  const loadReports = async () => {
    try {
      setError("");

      const data = await getCitizenReports();

      setReports(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load citizen reports.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();

    const interval = window.setInterval(() => {
      void loadReports();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const incidents = useMemo(
    () =>
      reports.map((report) =>
        mapReportToIncident(report),
      ),
    [reports],
  );

  const filteredIncidents = useMemo(() => {
    if (filter === "ALL") {
      return incidents;
    }

    return incidents.filter(
      (incident) => incident.status === filter,
    );
  }, [filter, incidents]);

  const counts = useMemo(
    () => ({
      total: incidents.length,

      verification: incidents.filter(
        (incident) =>
          incident.status ===
          "Under verification",
      ).length,

      active: incidents.filter(
        (incident) =>
          incident.status === "Verified" ||
          incident.status === "Assigned",
      ).length,

      critical: incidents.filter(
        (incident) =>
          incident.severity === "CRITICAL" &&
          incident.status !== "Resolved",
      ).length,
    }),
    [incidents],
  );

  const refreshReports = () => {
    setLoading(true);
    void loadReports();
  };

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Page header */}
      <header className="border-b border-warm-200 bg-white">
        <div className="mx-auto max-w-360 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-maroon-600" />

                <p className="text-[10px] font-bold uppercase tracking-widest text-maroon-700">
                  UrbanFlo / Authority
                </p>
              </div>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-warm-900 sm:text-3xl">
                Incident Management
              </h1>

              <p className="mt-1 text-sm text-warm-500">
                Review, verify and coordinate citizen-reported
                flood incidents · {city.name}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden border border-warm-200 bg-warm-50 px-3 py-2 sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-400">
                  Queue
                </p>

                <p className="mt-0.5 text-sm font-bold text-warm-800">
                  {loading
                    ? "Loading..."
                    : `${counts.total} reports`}
                </p>
              </div>

              <button
                type="button"
                onClick={refreshReports}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 border border-warm-300 bg-white px-3 text-xs font-semibold text-warm-700 transition hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loading ? "animate-spin" : ""
                  }`}
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-360 px-4 py-5 sm:px-6 lg:px-8">
        {/* Backend error */}
        {error && (
          <section className="mb-5 border border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                    Backend connection error
                  </p>

                  <p className="mt-1 text-sm font-semibold text-red-950">
                    Unable to load citizen reports.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={refreshReports}
                className="shrink-0 border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {/* Priority status */}
        <section className="border border-red-200 bg-red-50">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-red-100 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                  Priority response
                </p>

                <h2 className="mt-1 text-lg font-bold text-red-950 sm:text-xl">
                  {counts.critical > 0
                    ? `${counts.critical} critical incident${
                        counts.critical > 1
                          ? "s"
                          : ""
                      } require attention`
                    : "No critical incidents require attention"}
                </h2>

                <p className="mt-1 max-w-3xl text-xs leading-5 text-red-800 sm:text-sm">
                  Review incoming citizen observations,
                  verify them against available flood
                  intelligence, and assign the appropriate
                  response team.
                </p>
              </div>
            </div>

            <div className="border border-red-200 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-warm-400">
                Verification queue
              </p>

              <p className="mt-1 text-2xl font-bold text-warm-900">
                {counts.verification}
              </p>

              <p className="text-[11px] text-warm-500">
                Awaiting review
              </p>
            </div>
          </div>
        </section>

        {/* Summary metrics */}
        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Total incidents"
            value={counts.total}
            detail="Backend citizen reports"
            icon={<FileCheck2 className="h-4 w-4" />}
          />

          <SummaryCard
            label="Verification"
            value={counts.verification}
            detail="Reports awaiting review"
            icon={<Clock3 className="h-4 w-4" />}
          />

          <SummaryCard
            label="Active response"
            value={counts.active}
            detail="Verified or assigned"
            icon={<Users className="h-4 w-4" />}
          />

          <SummaryCard
            label="Critical"
            value={counts.critical}
            detail="Requires priority action"
            icon={<AlertTriangle className="h-4 w-4" />}
            alert={counts.critical > 0}
          />
        </section>

        {/* Incident queue */}
        <section className="mt-6 overflow-hidden border border-warm-200 bg-white">
          <div className="border-b border-warm-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-maroon-600" />

                  <h2 className="text-base font-bold text-warm-900">
                    Incident queue
                  </h2>
                </div>

                <p className="mt-1 text-xs text-warm-500">
                  Live citizen reports from the FastAPI
                  backend · refresh interval 30 seconds
                </p>
              </div>

              <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
                {(
                  [
                    ["ALL", "All"],
                    [
                      "Under verification",
                      "Verification",
                    ],
                    ["Verified", "Verified"],
                    ["Assigned", "Assigned"],
                    ["Resolved", "Resolved"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`shrink-0 border px-3 py-2 text-[11px] font-semibold transition ${
                      filter === value
                        ? "border-maroon-700 bg-maroon-700 text-white"
                        : "border-warm-200 bg-white text-warm-600 hover:bg-warm-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-maroon-700" />

                <p className="mt-3 text-sm font-semibold text-warm-700">
                  Loading reports...
                </p>

                <p className="mt-1 text-xs text-warm-500">
                  Fetching citizen observations from the
                  backend.
                </p>
              </div>
            ) : filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onSelect={() =>
                    setSelectedIncident(incident)
                  }
                />
              ))
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
                <CheckCircle2 className="h-7 w-7 text-green-600" />

                <p className="mt-3 text-sm font-semibold text-warm-700">
                  No incidents match this filter.
                </p>

                <p className="mt-1 text-xs text-warm-500">
                  Try another operational status.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Workflow + model feedback */}
        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Response workflow */}
          <div className="border border-warm-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-maroon-600" />

              <p className="text-[10px] font-bold uppercase tracking-widest text-maroon-700">
                Response workflow
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {[
                [
                  "01",
                  "Receive",
                  "Citizen report enters the backend queue.",
                ],
                [
                  "02",
                  "Verify",
                  "Compare report with available flood intelligence.",
                ],
                [
                  "03",
                  "Assign",
                  "Send the appropriate field team.",
                ],
                [
                  "04",
                  "Resolve",
                  "Close the incident after field confirmation.",
                ],
              ].map(
                ([number, title, description]) => (
                  <div
                    key={number}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-maroon-700 font-mono text-[10px] font-bold text-white">
                      {number}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-warm-900">
                        {title}
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-warm-500">
                        {description}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Model feedback */}
          <div className="border border-warm-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-maroon-600" />

              <p className="text-[10px] font-bold uppercase tracking-widest text-maroon-700">
                Model feedback
              </p>
            </div>

            <h3 className="mt-3 text-base font-bold text-warm-900 sm:text-lg">
              Verified reports can become model evidence
            </h3>

            <p className="mt-2 text-xs leading-5 text-warm-600 sm:text-sm">
              Verified observations such as blocked inlets,
              drainage surcharge, or unexpected water
              accumulation can be marked as model-relevant
              evidence.
            </p>

            <div className="mt-4 border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                <p className="text-xs leading-5 text-amber-800">
                  The current prototype persists the
                  model-relevant decision but does not yet
                  automatically recalibrate the flood model.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
              <span className="border border-warm-200 bg-warm-100 px-2.5 py-1.5 text-warm-700">
                Citizen report
              </span>

              <span className="text-warm-400">→</span>

              <span className="border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-800">
                Verification
              </span>

              <span className="text-warm-400">→</span>

              <span className="border border-maroon-200 bg-maroon-50 px-2.5 py-1.5 text-maroon-700">
                Model feedback
              </span>

              <span className="text-warm-400">→</span>

              <span className="border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-800">
                Future recalibration
              </span>
            </div>
          </div>
        </section>

        {/* System note */}
        <footer className="mt-5 border-t border-warm-200 py-5">
          <div className="flex flex-col gap-2 text-[10px] leading-5 text-warm-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              BACKEND CONNECTED · Incident records,
              verification, team assignment and status
              updates are persisted through the FastAPI
              report API.
            </p>

            <p className="shrink-0 font-mono">
              AUTO REFRESH · 30S
            </p>
          </div>

          <p className="mt-1 text-[10px] leading-5 text-warm-400">
            Automatic flood-model recalibration from verified
            reports remains a future integration step.
          </p>
        </footer>
      </main>

      {selectedIncident && (
        <IncidentDetailPanel
          incident={selectedIncident}
          onClose={() =>
            setSelectedIncident(null)
          }
          onUpdated={loadReports}
        />
      )}
    </div>
  );
}