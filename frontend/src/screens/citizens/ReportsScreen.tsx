import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldAlert,
  Activity,
  ArrowRight,
  MapPin,
  RefreshCw,
  Droplets,
} from "lucide-react";

import {
  CitizenReport,
  createCitizenReport,
  getCitizenReports,
} from "../../data/api";

import { useApp } from "../../state/AppContext";

import {
  cityData,
  Incident,
  IncidentType,
  RiskLevel,
  IncidentStatus,
} from "../../data/mockData";

import StatusBadge from "../../components/ui/StatusBadge";

/* =========================================================
   CONFIG
   ========================================================= */

const FILTERS = [
  "All",
  "CRITICAL",
  "HIGH",
  "MODERATE",
  "LOW",
] as const;

type ReportFilter = (typeof FILTERS)[number];

const ISSUE_TYPES: IncidentType[] = [
  "Blocked Drain",
  "Waterlogging",
  "Drain Overflow",
  "Damaged Drain",
  "Other",
];

const SEVERITIES: RiskLevel[] = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
];

const typeIcon: Record<string, string> = {
  "Blocked Drain": "🔧",
  Waterlogging: "💧",
  "Drain Overflow": "⚠",
  "Damaged Drain": "🔨",
  Other: "📋",
};

/*
 * Prototype coordinates used when a citizen enters a
 * location as text but does not provide GPS coordinates.
 *
 * These are city-centre/default coordinates only.
 * Production should replace this with actual map/GPS
 * coordinates selected by the citizen.
 */
const CITY_COORDS: Record<
  string,
  {
    latitude: number;
    longitude: number;
  }
> = {
  delhi: {
    latitude: 28.6139,
    longitude: 77.209,
  },

  mumbai: {
    latitude: 19.076,
    longitude: 72.8777,
  },

  chennai: {
    latitude: 13.0827,
    longitude: 80.2707,
  },

  Delhi: {
    latitude: 28.6139,
    longitude: 77.209,
  },

  Mumbai: {
    latitude: 19.076,
    longitude: 72.8777,
  },

  Chennai: {
    latitude: 13.0827,
    longitude: 80.2707,
  },
};

/* =========================================================
   TYPES
   ========================================================= */

/*
 * We keep the existing Incident UI model but add the
 * backend's actual model_relevant decision.
 */
type ReportIncident = Incident & {
  modelRelevant: boolean;
};

/* =========================================================
   STATUS META
   ========================================================= */

const statusMeta: Record<
  IncidentStatus,
  {
    icon: typeof Clock;
    color: string;
    bg: string;
    border: string;
  }
> = {
  Confirmed: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },

  "Under verification": {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },

  Resolved: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },

  Closed: {
    icon: CheckCircle,
    color: "text-warm-400",
    bg: "bg-warm-50",
    border: "border-warm-200",
  },
};

/*
 * Backend can return "Rejected", while the existing
 * frontend IncidentStatus does not necessarily contain it.
 *
 * We normalize rejected reports to Closed for the current
 * citizen UI rather than changing the shared mockData type.
 */
function normalizeIncidentStatus(
  status: string,
): IncidentStatus {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "Confirmed";

    case "under verification":
      return "Under verification";

    case "resolved":
      return "Resolved";

    case "closed":
      return "Closed";

    case "rejected":
      return "Closed";

    default:
      return "Under verification";
  }
}

/* =========================================================
   INCIDENT ROW
   ========================================================= */

function IncidentRow({
  incident,
  expanded,
  onToggle,
}: {
  incident: ReportIncident;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = statusMeta[incident.status];
  const StatusIcon = meta.icon;

  const affectsModel = incident.modelRelevant;

  return (
    <div
      className={`border-b border-warm-100 transition-colors ${
        expanded
          ? "bg-warm-50/60"
          : "hover:bg-warm-50/40"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 shrink-0 text-base leading-none">
            {typeIcon[incident.type] ?? "📋"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-warm-400">
                {incident.id}
              </span>

              <span className="truncate text-sm font-medium text-warm-900">
                {incident.location}
              </span>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-warm-500">
                {incident.type}
              </span>

              <span className="text-warm-300">
                ·
              </span>

              <span className="text-[11px] font-mono text-warm-400">
                {incident.reportedAt}
              </span>

              {affectsModel && (
                <>
                  <span className="text-warm-300">
                    ·
                  </span>

                  <span className="text-[9px] font-mono uppercase tracking-wide text-maroon-700">
                    Model relevant
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge level={incident.severity} />

            <div className="hidden items-center gap-1 sm:flex">
              <StatusIcon
                size={13}
                className={meta.color}
              />

              <span className="hidden text-[10px] font-mono text-warm-500 md:block">
                {incident.status}
              </span>
            </div>

            {expanded ? (
              <ChevronUp
                size={14}
                className="text-warm-400"
              />
            ) : (
              <ChevronDown
                size={14}
                className="text-warm-400"
              />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-0.5 text-[10px] font-mono text-warm-400">
                STATUS
              </div>

              <div className="flex items-center gap-1.5">
                <StatusIcon
                  size={13}
                  className={meta.color}
                />

                <span className="text-xs text-warm-700">
                  {incident.status}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-0.5 text-[10px] font-mono text-warm-400">
                IMPACT
              </div>

              <div className="text-xs text-warm-700">
                {incident.impact}
              </div>
            </div>

            <div>
              <div className="mb-0.5 text-[10px] font-mono text-warm-400">
                MODEL RELEVANCE
              </div>

              <div
                className={`text-xs font-medium ${
                  affectsModel
                    ? "text-maroon-700"
                    : "text-warm-500"
                }`}
              >
                {affectsModel
                  ? "Potential model input"
                  : "Observation only"}
              </div>
            </div>
          </div>

          {incident.description && (
            <div className="mt-3 border border-warm-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-warm-600">
              {incident.description}
            </div>
          )}

          {incident.status === "Confirmed" &&
            affectsModel && (
              <div className="mt-3 border border-maroon-200 bg-maroon-50 px-3 py-3">
                <div className="flex items-start gap-2">
                  <RefreshCw
                    size={14}
                    className="mt-0.5 shrink-0 text-maroon-700"
                  />

                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wide text-maroon-700">
                      Model feedback
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-maroon-900">
                      This confirmed drainage-related
                      observation has been marked as
                      relevant to the flood model.
                      Production recalibration can use
                      verified infrastructure conditions
                      as model inputs.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   REPORT MODAL
   ========================================================= */

function ReportModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const { state } = useApp();

  const city = cityData[state.city];

  const [type, setType] =
    useState<IncidentType>("Blocked Drain");

  const [location, setLocation] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [severity, setSeverity] =
    useState<RiskLevel>("MODERATE");

  const [submitted, setSubmitted] =
    useState<CitizenReport | null>(null);

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedLocation =
      location.trim();

    const trimmedDescription =
      description.trim();

    if (!trimmedLocation) {
      setError(
        "Please enter the location of the issue.",
      );
      return;
    }

    if (trimmedLocation.length < 3) {
      setError(
        "Please provide a more specific location.",
      );
      return;
    }

    if (trimmedDescription.length > 500) {
      setError(
        "Description must be 500 characters or less.",
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const coords =
        CITY_COORDS[state.city] ??
        CITY_COORDS[
          String(state.city).toLowerCase()
        ] ??
        CITY_COORDS.delhi;

      const report =
        await createCitizenReport({
          issue_type: type,
          location: trimmedLocation,
          latitude: coords.latitude,
          longitude: coords.longitude,
          severity,
          description:
            trimmedDescription || undefined,
        });

      setSubmitted(report);

      /*
       * Refresh the parent screen immediately so the new
       * backend-persisted report appears in the list.
       */
      await onSubmitted();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the report. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- SUBMITTED STATE ---------------- */

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-sm border border-warm-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle
              size={24}
              className="text-green-600"
            />
          </div>

          <div className="text-center">
            <h2 className="text-lg font-bold text-warm-900">
              Report Received
            </h2>

            <p className="mt-1 text-sm leading-5 text-warm-500">
              Your observation has been
              submitted to the UrbanFlo backend.
            </p>
          </div>

          <div className="mt-5 border border-warm-200 bg-warm-50 px-4 py-3">
            <div className="text-[10px] font-mono uppercase tracking-wide text-warm-400">
              Reference
            </div>

            <div className="mt-1 font-mono text-base font-bold text-maroon-700">
              IN-
              {String(submitted.id).padStart(
                4,
                "0",
              )}
            </div>

            <div className="mt-1 text-xs text-warm-500">
              Status: {submitted.status}
            </div>
          </div>

          <div className="mt-4 border border-blue-200 bg-blue-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <Activity
                size={14}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <p className="text-[11px] leading-relaxed text-blue-800">
                Authorities can review this
                observation alongside rainfall,
                drainage and flood intelligence.
                Verified infrastructure issues can
                be marked as model-relevant.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full bg-maroon-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-maroon-800"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- FORM ---------------- */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-warm-200 bg-white shadow-xl">
        {/* Header */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-warm-200 bg-white px-5 py-4">
          <div>
            <div className="text-base font-bold text-warm-900">
              Report an Issue
            </div>

            <div className="mt-0.5 text-xs text-warm-400">
              {city.name} · Share a real-world
              observation
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-warm-400 transition-colors hover:text-warm-700"
            aria-label="Close report form"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5"
        >
          {/* Issue type */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-warm-700">
              Issue Type
            </label>

            <select
              value={type}
              onChange={(event) => {
                setType(
                  event.target.value as IncidentType,
                );
                setError("");
              }}
              className="w-full border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-800 outline-none transition focus:border-maroon-600"
            >
              {ISSUE_TYPES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-warm-700">
              Location{" "}
              <span className="text-red-500">
                *
              </span>
            </label>

            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
              />

              <input
                type="text"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setError("");
                }}
                placeholder={`e.g. Ring Road near ${city.name}`}
                className="w-full border border-warm-200 py-2.5 pl-9 pr-3 text-sm text-warm-800 outline-none placeholder:text-warm-300 transition focus:border-maroon-600"
                required
              />
            </div>

            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={13} />
                {error}
              </div>
            )}
          </div>

          {/* Severity */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-warm-700">
              Severity
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEVERITIES.map((item) => {
                const selected =
                  severity === item;

                let selectedClass =
                  "bg-green-600 border-green-600";

                if (item === "MODERATE") {
                  selectedClass =
                    "bg-amber-500 border-amber-500";
                }

                if (item === "HIGH") {
                  selectedClass =
                    "bg-orange-600 border-orange-600";
                }

                if (item === "CRITICAL") {
                  selectedClass =
                    "bg-red-600 border-red-600";
                }

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setSeverity(item);
                      setError("");
                    }}
                    className={`border py-2 text-xs font-medium transition-colors ${
                      selected
                        ? `${selectedClass} text-white`
                        : "border-warm-200 text-warm-600 hover:bg-warm-50"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-warm-700">
              Description{" "}
              <span className="font-normal text-warm-400">
                (optional)
              </span>
            </label>

            <textarea
              value={description}
              onChange={(event) => {
                setDescription(
                  event.target.value,
                );
                setError("");
              }}
              maxLength={500}
              rows={4}
              placeholder="Describe what you observed — water depth, blockage, affected road, overflow..."
              className="w-full resize-none border border-warm-200 px-3 py-2.5 text-sm text-warm-800 outline-none placeholder:text-warm-300 transition focus:border-maroon-600"
            />

            <div className="mt-1 text-right text-[10px] font-mono text-warm-400">
              {description.length}/500
            </div>
          </div>

          {/* Workflow */}

          <div className="border border-warm-200 bg-warm-50 px-3 py-3">
            <div className="mb-2 text-[10px] font-mono uppercase tracking-wide text-warm-500">
              What happens next
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                "Report",
                "Verify",
                "Confirm",
                "Model feedback",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`px-2 py-1 text-[9px] font-mono ${
                      index === 0
                        ? "bg-maroon-700 text-white"
                        : "border border-warm-200 bg-white text-warm-500"
                    }`}
                  >
                    {step}
                  </span>

                  {index < 3 && (
                    <ArrowRight
                      size={11}
                      className="text-warm-300"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Backend notice */}

          <div className="border border-green-200 bg-green-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle
                size={14}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <p className="text-[11px] leading-relaxed text-green-800">
                Reports are now submitted to the
                FastAPI backend and can be reviewed
                by the authority workflow.
              </p>
            </div>
          </div>

          {/* Actions */}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 border border-warm-200 py-2.5 text-sm text-warm-600 transition-colors hover:bg-warm-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-maroon-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-maroon-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function ReportsScreen() {
  const { state, dispatch } = useApp();

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [backendReports, setBackendReports] =
    useState<CitizenReport[]>([]);

  const [reportsLoading, setReportsLoading] =
    useState(true);

  const [reportsError, setReportsError] =
    useState("");

  const city = cityData[state.city];

  /* =======================================================
     LOAD BACKEND REPORTS
     ======================================================= */

  const loadReports = async () => {
    try {
      setReportsError("");

      const reports =
        await getCitizenReports();

      setBackendReports(reports);
    } catch (error) {
      setReportsError(
        error instanceof Error
          ? error.message
          : "Unable to load reports.",
      );
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();

    const interval =
      window.setInterval(() => {
        void loadReports();
      }, 30000);

    return () =>
      window.clearInterval(interval);
  }, []);

  /* =======================================================
     MAP BACKEND REPORTS → EXISTING UI MODEL
     ======================================================= */

  const incidents: ReportIncident[] =
    useMemo(
      () =>
        backendReports.map((report) => ({
          id: `IN-${String(
            report.id,
          ).padStart(4, "0")}`,

          location: report.location,

          type:
            report.issue_type as IncidentType,

          severity:
            report.severity as RiskLevel,

          reportedAt:
            new Date(
              report.created_at,
            ).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            ),

          status:
            normalizeIncidentStatus(
              report.status,
            ),

          impact:
            report.status === "Confirmed"
              ? "Verified field condition"
              : report.status === "Resolved"
                ? "Incident resolved"
                : report.status ===
                    "Rejected"
                  ? "Report rejected during verification"
                  : "Pending assessment",

          description:
            report.description ?? "",

          modelRelevant:
            report.model_relevant,
        })),
      [backendReports],
    );

  /* =======================================================
     FILTER
     ======================================================= */

  const filter: ReportFilter =
    state.incidentFilter as ReportFilter;

  /* =======================================================
     FILTERED INCIDENTS
     ======================================================= */

  const filteredIncidents =
    useMemo(() => {
      if (filter === "All") {
        return incidents;
      }

      return incidents.filter(
        (incident) =>
          incident.severity === filter,
      );
    }, [filter, incidents]);

  /* =======================================================
     COUNTS
     ======================================================= */

  const counts: Record<
    ReportFilter,
    number
  > = useMemo(
    () => ({
      All: incidents.length,

      CRITICAL: incidents.filter(
        (incident) =>
          incident.severity === "CRITICAL",
      ).length,

      HIGH: incidents.filter(
        (incident) =>
          incident.severity === "HIGH",
      ).length,

      MODERATE: incidents.filter(
        (incident) =>
          incident.severity === "MODERATE",
      ).length,

      LOW: incidents.filter(
        (incident) =>
          incident.severity === "LOW",
      ).length,
    }),
    [incidents],
  );

  /* =======================================================
     STATUS COUNTS
     ======================================================= */

  const statusCounts = useMemo(
    () => ({
      verification: incidents.filter(
        (incident) =>
          incident.status ===
          "Under verification",
      ).length,

      confirmed: incidents.filter(
        (incident) =>
          incident.status === "Confirmed",
      ).length,

      resolved: incidents.filter(
        (incident) =>
          incident.status === "Resolved" ||
          incident.status === "Closed",
      ).length,
    }),
    [incidents],
  );

  /* =======================================================
     MODEL RELEVANT REPORTS
     ======================================================= */

  const modelRelevantReports =
    useMemo(
      () =>
        incidents.filter(
          (incident) =>
            incident.modelRelevant,
        ).length,
      [incidents],
    );

  /* =======================================================
     PRIORITY REPORTS
     ======================================================= */

  const priorityReports = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          incident.severity ===
            "CRITICAL" ||
          incident.severity === "HIGH",
      ),
    [incidents],
  );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-warm-500">
            Citizen intelligence
          </div>

          <h1 className="text-xl font-bold text-warm-900 md:text-2xl">
            Reports & Incidents —{" "}
            {city.name}
          </h1>

          <p className="mt-1 text-sm text-warm-500">
            Report real-world conditions that
            can strengthen flood nowcasting.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center justify-center gap-1.5 bg-maroon-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-maroon-800"
        >
          <Plus size={14} />
          Report an Issue
        </button>
      </div>

      {/* ===================================================
          BACKEND ERROR
          =================================================== */}

      {reportsError && (
        <div className="mb-6 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-red-900">
              Unable to load backend reports
            </div>

            <p className="mt-1 text-[11px] leading-relaxed text-red-700">
              {reportsError}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setReportsLoading(true);
              void loadReports();
            }}
            className="shrink-0 border border-red-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* ===================================================
          OVERVIEW
          =================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border border-warm-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle
              size={14}
              className="text-warm-400"
            />

            <span className="text-[10px] font-mono uppercase tracking-wide text-warm-500">
              Total reports
            </span>
          </div>

          <div className="font-mono text-2xl font-bold text-warm-900">
            {reportsLoading
              ? "—"
              : incidents.length}
          </div>

          <div className="mt-1 text-[10px] text-warm-400">
            Backend records
          </div>
        </div>

        <div className="border border-warm-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock
              size={14}
              className="text-amber-500"
            />

            <span className="text-[10px] font-mono uppercase tracking-wide text-warm-500">
              Verification
            </span>
          </div>

          <div className="font-mono text-2xl font-bold text-amber-700">
            {reportsLoading
              ? "—"
              : statusCounts.verification}
          </div>

          <div className="mt-1 text-[10px] text-warm-400">
            Awaiting confirmation
          </div>
        </div>

        <div className="border border-warm-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert
              size={14}
              className="text-red-500"
            />

            <span className="text-[10px] font-mono uppercase tracking-wide text-warm-500">
              Confirmed
            </span>
          </div>

          <div className="font-mono text-2xl font-bold text-red-700">
            {reportsLoading
              ? "—"
              : statusCounts.confirmed}
          </div>

          <div className="mt-1 text-[10px] text-warm-400">
            Verified incidents
          </div>
        </div>

        <div className="border border-warm-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity
              size={14}
              className="text-maroon-600"
            />

            <span className="text-[10px] font-mono uppercase tracking-wide text-warm-500">
              Model relevant
            </span>
          </div>

          <div className="font-mono text-2xl font-bold text-maroon-700">
            {reportsLoading
              ? "—"
              : modelRelevantReports}
          </div>

          <div className="mt-1 text-[10px] text-warm-400">
            Authority-marked model inputs
          </div>
        </div>
      </div>

      {/* ===================================================
          FEEDBACK LOOP
          =================================================== */}

      <div className="mb-6 border border-warm-200 bg-white">
        <div className="border-b border-warm-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <RefreshCw
              size={15}
              className="text-maroon-700"
            />

            <div>
              <div className="text-sm font-semibold text-warm-900">
                Citizen-to-model feedback loop
              </div>

              <div className="mt-0.5 text-[11px] font-mono text-warm-400">
                Field observations → verification →
                model intelligence
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {[
              {
                number: "01",
                title: "Observe",
                description:
                  "Citizen or field team reports a condition.",
              },
              {
                number: "02",
                title: "Verify",
                description:
                  "Authority checks the reported incident.",
              },
              {
                number: "03",
                title: "Confirm",
                description:
                  "Verified conditions become trusted evidence.",
              },
              {
                number: "04",
                title: "Recalculate",
                description:
                  "The drainage and flood models can incorporate the condition.",
              },
              {
                number: "05",
                title: "Update",
                description:
                  "Forecast and routing intelligence can change.",
              },
            ].map((step, index, array) => (
              <div
                key={step.number}
                className="relative"
              >
                <div className="h-full border border-warm-200 bg-warm-50 p-3">
                  <div className="mb-2 text-[9px] font-mono text-warm-400">
                    {step.number}
                  </div>

                  <div className="text-xs font-semibold text-warm-900">
                    {step.title}
                  </div>

                  <p className="mt-1.5 text-[10px] leading-relaxed text-warm-500">
                    {step.description}
                  </p>
                </div>

                {index <
                  array.length - 1 && (
                  <ArrowRight
                    size={13}
                    className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 bg-white text-warm-300 sm:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================
          PRIORITY REPORTS
          =================================================== */}

      {priorityReports.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50">
          <div className="border-b border-red-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert
                size={15}
                className="text-red-600"
              />

              <div>
                <div className="text-sm font-semibold text-red-900">
                  Priority incidents
                </div>

                <div className="mt-0.5 text-[11px] font-mono text-red-700">
                  High-severity observations
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-red-100">
            {priorityReports
              .slice(0, 3)
              .map((incident) => (
                <button
                  type="button"
                  key={incident.id}
                  onClick={() =>
                    setExpandedId(
                      incident.id,
                    )
                  }
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-red-100/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-base">
                      {typeIcon[
                        incident.type
                      ] ?? "📋"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-red-700">
                        {incident.id}
                      </div>

                      <div className="truncate text-sm font-medium text-red-950">
                        {incident.location}
                      </div>

                      <div className="mt-0.5 text-[10px] text-red-700">
                        {incident.type} ·{" "}
                        {incident.status}
                      </div>
                    </div>

                    <StatusBadge
                      level={
                        incident.severity
                      }
                    />
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ===================================================
          FILTERS
          =================================================== */}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter
          size={13}
          className="text-warm-400"
        />

        {FILTERS.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() =>
              dispatch({
                type: "SET_INCIDENT_FILTER",
                filter: item,
              })
            }
            className={`border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === item
                ? "border-maroon-700 bg-maroon-700 text-white"
                : "border-warm-200 text-warm-600 hover:bg-warm-50"
            }`}
          >
            {item}

            <span className="ml-1 opacity-70">
              ({counts[item]})
            </span>
          </button>
        ))}
      </div>

      {/* ===================================================
          INCIDENT LIST
          =================================================== */}

      <div className="border border-warm-200 bg-white">
        <div className="border-b border-warm-100 bg-warm-50 px-4 py-2.5">
          <div className="grid grid-cols-[1.5rem_1fr_auto] gap-3 text-[10px] font-mono uppercase tracking-wide text-warm-400">
            <span />

            <span>
              Incident · Location
            </span>

            <span>
              Severity · Status
            </span>
          </div>
        </div>

        {/* Loading */}

        {reportsLoading && (
          <div className="px-4 py-10 text-center">
            <RefreshCw
              size={20}
              className="mx-auto animate-spin text-maroon-600"
            />

            <div className="mt-2 text-sm font-medium text-warm-700">
              Loading reports
            </div>

            <div className="mt-1 text-xs text-warm-400">
              Fetching citizen observations from
              the backend.
            </div>
          </div>
        )}

        {/* Empty */}

        {!reportsLoading &&
          filteredIncidents.length ===
            0 && (
            <div className="px-4 py-10 text-center">
              <AlertCircle
                size={22}
                className="mx-auto text-warm-300"
              />

              <div className="mt-2 text-sm font-medium text-warm-700">
                No incidents found
              </div>

              <div className="mt-1 text-xs text-warm-400">
                There are no backend reports matching
                this severity filter.
              </div>
            </div>
          )}

        {/* Reports */}

        {!reportsLoading &&
          filteredIncidents.map(
            (incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                expanded={
                  expandedId ===
                  incident.id
                }
                onToggle={() =>
                  setExpandedId(
                    expandedId ===
                      incident.id
                      ? null
                      : incident.id,
                  )
                }
              />
            ),
          )}
      </div>

      {/* ===================================================
          REPORTING GUIDANCE
          =================================================== */}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Droplets
              size={15}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <div className="text-xs font-semibold text-blue-900">
                What to report
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-blue-800">
                Blocked drains, sudden waterlogging,
                overflowing drains, damaged drainage
                infrastructure, and unusually deep
                water are especially useful
                observations.
              </p>
            </div>
          </div>
        </div>

        <div className="border border-warm-200 bg-warm-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Activity
              size={15}
              className="mt-0.5 shrink-0 text-warm-500"
            />

            <div>
              <div className="text-xs font-semibold text-warm-900">
                Why reports matter
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-warm-600">
                Field observations provide another
                evidence source alongside rainfall,
                terrain and drainage-model
                information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          BACKEND STATUS
          =================================================== */}

      <div className="mt-4 border border-green-200 bg-green-50 px-3 py-2.5">
        <p className="text-[10px] font-mono leading-relaxed text-green-800">
          BACKEND CONNECTED · Citizen reports are
          persisted through the FastAPI report API.
          Authority verification can update report
          status, assignment and model relevance.
          Production model recalibration remains a
          separate integration step.
        </p>
      </div>

      {/* ===================================================
          MODAL
          =================================================== */}

      {modalOpen && (
        <ReportModal
          onClose={() =>
            setModalOpen(false)
          }
          onSubmitted={loadReports}
        />
      )}
    </div>
  );
}