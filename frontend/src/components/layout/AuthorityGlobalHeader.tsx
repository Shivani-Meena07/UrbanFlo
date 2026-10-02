import {
  Bell,
  ChevronDown,
  Menu,
  X,
  MapPin,
  User,
  LogOut,
  Settings,
  Star,
  BellOff,
} from "lucide-react";

import { useApp, CityKey } from "../../state/AppContext";
import { cityData } from "../../data/mockData";

export type AuthorityPage =
  | "overview"
  | "incidents"
  | "drainage"
  | "field-response"
  | "model-intelligence";

interface AuthorityGlobalHeaderProps {
  activePage: AuthorityPage;
  onPageChange: (page: AuthorityPage) => void;
}

const AUTHORITY_NAV: {
  key: AuthorityPage;
  label: string;
}[] = [
  { key: "overview", label: "Overview" },
  { key: "incidents", label: "Incidents" },
  { key: "drainage", label: "Drainage" },
  { key: "field-response", label: "Field Response" },
  { key: "model-intelligence", label: "Model Intelligence" },
];

const CITIES: CityKey[] = ["delhi", "mumbai", "chennai"];

const alertColors: Record<string, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-amber-600",
  MODERATE: "bg-yellow-600",
  SAFE: "bg-green-600",
};

export default function AuthorityGlobalHeader({
  activePage,
  onPageChange,
}: AuthorityGlobalHeaderProps) {
  const { state, dispatch } = useApp();

  const data = cityData[state.city];

  const unread = state.notifications.filter(
    (n) => !n.read
  ).length;

  const handleNavigation = (page: AuthorityPage) => {
    onPageChange(page);

    if (state.mobileMenuOpen) {
      dispatch({
        type: "TOGGLE_MOBILE_MENU",
      });
    }
  };

  return (
    <header
      className="
        sticky top-0 z-5000 isolate
        bg-white
        border-b border-warm-200
        shadow-[0_1px_4px_rgba(0,0,0,0.07)]
      "
    >
      {/* =====================================================
          MAIN HEADER
      ===================================================== */}

      <div className="flex items-center h-14 px-3 sm:px-4 gap-2 sm:gap-4">
        {/* ===================================================
            LOGO
        =================================================== */}

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="
              w-7 h-7
              bg-maroon-700
              flex items-center justify-center
              rounded-[3px]
              shadow-sm
            "
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 2C5 2 2 5 2 9C2 12 4 14 8 14C12 14 14 12 14 9C14 5 11 2 8 2Z"
                fill="white"
                fillOpacity="0.9"
              />

              <path
                d="M4 9C4 9 5 7 8 7C11 7 12 9 12 9"
                stroke="#8B1A2A"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              <circle
                cx="8"
                cy="9"
                r="1.5"
                fill="#8B1A2A"
              />
            </svg>
          </div>

          <div>
            <div className="text-maroon-700 font-bold text-base tracking-tight leading-none">
              UrbanFlo
            </div>

            <div className="text-warm-500 text-[9px] leading-none tracking-wide hidden sm:block">
              FLOOD NOWCASTING
            </div>
          </div>
        </div>

        {/* ===================================================
            AUTHORITY BADGE
        =================================================== */}

        <div
          className="
            hidden md:flex
            items-center gap-1.5
            px-2 py-1
            rounded-sm
            bg-warm-800
            text-white
            text-[10px]
            font-medium
            tracking-wide
          "
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          AUTHORITY
        </div>

        {/* ===================================================
            ALERT STATUS
        =================================================== */}

        <div
          className={`
            hidden lg:flex
            items-center gap-1.5
            px-2 py-1
            rounded-sm
            text-white
            text-[10px]
            font-medium
            tracking-wide
            ${alertColors[data.alertLevel] ?? "bg-warm-500"}
          `}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />

          {data.alertLevel}
        </div>

        {/* ===================================================
            DESKTOP AUTHORITY NAVIGATION
        =================================================== */}

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {AUTHORITY_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.key)}
              className={`
                px-3 py-1.5
                text-sm
                font-medium
                rounded-[3px]
                transition-all
                whitespace-nowrap
                ${
                  activePage === item.key
                    ? "bg-maroon-50 text-maroon-700 shadow-[inset_0_-2px_0_#8B1A2A]"
                    : "text-warm-700 hover:text-warm-900 hover:bg-warm-100"
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* ===================================================
            RIGHT SIDE ACTIONS
        =================================================== */}

        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          {/* =================================================
              CITY SELECTOR
          ================================================= */}

          <div className="relative hidden md:block">
            <button
              className="
                flex items-center gap-1.5
                px-2.5 py-1.5
                text-sm font-medium
                text-warm-800
                bg-warm-100
                hover:bg-warm-200
                rounded-[3px]
                transition-colors
                border border-warm-200
              "
              onClick={() => {
                const next =
                  CITIES[
                    (CITIES.indexOf(state.city) + 1) %
                      CITIES.length
                  ];

                dispatch({
                  type: "SET_CITY",
                  city: next,
                });
              }}
            >
              <MapPin
                size={13}
                className="text-maroon-700"
              />

              <span>{cityData[state.city].name}</span>

              <ChevronDown size={12} />
            </button>
          </div>

          {/* Hidden native select retained */}
          <select
            className="
              hidden md:block
              text-xs text-warm-600
              bg-transparent
              border-none
              outline-none
              cursor-pointer
              absolute
              opacity-0
              w-0 h-0
            "
            value={state.city}
            onChange={(e) =>
              dispatch({
                type: "SET_CITY",
                city: e.target.value as CityKey,
              })
            }
          >
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {cityData[city].name}
              </option>
            ))}
          </select>

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <div className="relative z-6000">
            <button
              onClick={() =>
                dispatch({
                  type: "TOGGLE_NOTIF",
                })
              }
              className="
                relative
                p-2
                text-warm-600
                hover:text-warm-900
                hover:bg-warm-100
                rounded-[3px]
                transition-colors
              "
              aria-label="Notifications"
              aria-expanded={state.notifOpen}
            >
              <Bell size={18} />

              {unread > 0 && (
                <span
                  className="
                    absolute
                    top-1 right-1
                    min-w-4 h-4
                    px-0.5
                    bg-maroon-700
                    text-white
                    text-[9px]
                    font-bold
                    rounded-full
                    flex items-center justify-center
                    border border-white
                  "
                >
                  {unread}
                </span>
              )}
            </button>

            {state.notifOpen && (
              <AuthorityNotificationDropdown />
            )}
          </div>

          {/* =================================================
              PROFILE
          ================================================= */}

          <div className="relative z-6000">
            <button
              onClick={() =>
                dispatch({
                  type: "TOGGLE_PROFILE",
                })
              }
              className="
                flex items-center gap-1.5
                p-1.5
                text-warm-600
                hover:text-warm-900
                hover:bg-warm-100
                rounded-[3px]
                transition-colors
              "
              aria-label="Profile menu"
              aria-expanded={state.profileOpen}
            >
              <div
                className="
                  w-7 h-7
                  rounded-full
                  bg-maroon-100
                  border border-maroon-200
                  flex items-center justify-center
                "
              >
                <User
                  size={14}
                  className="text-maroon-700"
                />
              </div>

              <ChevronDown
                size={12}
                className="hidden sm:block"
              />
            </button>

            {state.profileOpen && (
              <AuthorityProfileDropdown />
            )}
          </div>

          {/* =================================================
              MOBILE MENU
          ================================================= */}

          <button
            onClick={() =>
              dispatch({
                type: "TOGGLE_MOBILE_MENU",
              })
            }
            className="
              lg:hidden
              p-2
              text-warm-600
              hover:text-warm-900
              hover:bg-warm-100
              rounded-[3px]
              transition-colors
            "
            aria-label="Menu"
            aria-expanded={state.mobileMenuOpen}
          >
            {state.mobileMenuOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          SYSTEM STATUS BAR
      ===================================================== */}

      <div
        className="
          hidden md:flex
          items-center gap-4
          px-4 py-1
          bg-warm-50
          border-t border-warm-100
          text-[10px]
          text-warm-500
          font-mono
          overflow-hidden
        "
      >
        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          SYSTEM OPERATIONAL
        </span>

        <span className="shrink-0">
          Data updated: 2 min ago
        </span>

        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Rainfall feed
        </span>

        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Drainage model
        </span>

        <span className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          Forecast engine
        </span>

        <span className="ml-auto text-warm-400 truncate">
          {data.alertMessage}
        </span>
      </div>

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      {state.mobileMenuOpen && (
        <div
          className="
            lg:hidden
            relative
            z-5500
            border-t border-warm-200
            bg-white
            shadow-lg
          "
        >
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {/* Selected City */}

            <div className="col-span-2 mb-1">
              <div className="text-[10px] text-warm-500 font-mono uppercase tracking-wide mb-1.5">
                Selected Area
              </div>

              <div className="flex gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() =>
                      dispatch({
                        type: "SET_CITY",
                        city,
                      })
                    }
                    className={`
                      flex-1
                      py-1.5
                      text-xs
                      font-medium
                      rounded-[3px]
                      border
                      transition-colors
                      ${
                        state.city === city
                          ? "bg-maroon-700 text-white border-maroon-700"
                          : "text-warm-700 border-warm-200 hover:border-maroon-300 hover:bg-maroon-50"
                      }
                    `}
                  >
                    {cityData[city].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Authority Navigation */}

            {AUTHORITY_NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.key)}
                className={`
                  py-2.5
                  text-sm
                  font-medium
                  rounded-[3px]
                  text-left
                  px-3
                  transition-colors
                  ${
                    activePage === item.key
                      ? "bg-maroon-50 text-maroon-700 border border-maroon-200"
                      : "text-warm-700 bg-warm-50 border border-warm-200 hover:bg-warm-100"
                  }
                `}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

/* ===========================================================
   NOTIFICATION DROPDOWN
=========================================================== */

function AuthorityNotificationDropdown() {
  const { state, dispatch } = useApp();

  const notifs = state.notifications;

  return (
    <div
      className="
        absolute
        right-0
        top-full
        mt-2
        w-[min(20rem,calc(100vw-1rem))]
        bg-white
        border border-warm-200
        rounded-[5px]
        shadow-[0_10px_35px_rgba(0,0,0,0.16)]
        z-7000
        overflow-hidden
      "
    >
      <div
        className="
          flex items-center justify-between
          px-3 py-2.5
          border-b border-warm-100
          bg-warm-50
        "
      >
        <div>
          <span className="text-sm font-semibold text-warm-800">
            Notifications
          </span>

          {notifs.length > 0 && (
            <div className="text-[10px] text-warm-400 mt-0.5">
              {notifs.length} recent updates
            </div>
          )}
        </div>

        <button
          onClick={() =>
            dispatch({
              type: "MARK_ALL_READ",
            })
          }
          className="
            text-[11px]
            text-maroon-700
            hover:text-maroon-800
            hover:underline
          "
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <BellOff
              size={18}
              className="mx-auto text-warm-300 mb-2"
            />

            <p className="text-xs text-warm-500">
              No notifications
            </p>
          </div>
        ) : (
          notifs.map((notification) => (
            <button
              key={notification.id}
              onClick={() =>
                dispatch({
                  type: "MARK_NOTIF_READ",
                  id: notification.id,
                })
              }
              className={`
                w-full
                text-left
                px-3 py-2.5
                border-b border-warm-50
                hover:bg-warm-50
                transition-colors
                ${
                  !notification.read
                    ? "bg-maroon-50/40"
                    : ""
                }
              `}
            >
              <div className="flex items-start gap-2">
                {!notification.read ? (
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-maroon-600 shrink-0" />
                ) : (
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-transparent border border-warm-300 shrink-0" />
                )}

                <div className="min-w-0">
                  <p className="text-xs text-warm-800 leading-4">
                    {notification.message}
                  </p>

                  <p className="text-[10px] text-warm-400 mt-0.5 font-mono">
                    {notification.time}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ===========================================================
   AUTHORITY PROFILE DROPDOWN
=========================================================== */

function AuthorityProfileDropdown() {
  const { dispatch } = useApp();

  const items = [
    {
      icon: User,
      label: "Operator Profile",
    },
    {
      icon: BellOff,
      label: "Notification Settings",
    },
    {
      icon: Star,
      label: "Assigned Areas",
    },
    {
      icon: Settings,
      label: "System Preferences",
    },
  ];

  return (
    <div
      className="
        absolute
        right-0
        top-full
        mt-2
        w-[min(14rem,calc(100vw-1rem))]
        bg-white
        border border-warm-200
        rounded-[5px]
        shadow-[0_10px_35px_rgba(0,0,0,0.16)]
        z-7000
        overflow-hidden
      "
    >
      {/* Profile heading */}

      <div className="px-3 py-3 border-b border-warm-100 bg-warm-50">
        <div className="flex items-center gap-2.5">
          <div
            className="
              w-8 h-8
              rounded-full
              bg-maroon-100
              border border-maroon-200
              flex items-center justify-center
              shrink-0
            "
          >
            <User
              size={15}
              className="text-maroon-700"
            />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-warm-800 truncate">
              Authority Operator
            </div>

            <div className="text-[10px] text-warm-500 truncate">
              Disaster Management Authority
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}

      <div className="py-1">
        {items.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() =>
              dispatch({
                type: "TOGGLE_PROFILE",
              })
            }
            className="
              w-full
              flex items-center gap-2.5
              px-3 py-2.5
              text-sm
              text-warm-700
              hover:bg-warm-50
              transition-colors
            "
          >
            <Icon
              size={14}
              className="text-warm-400 shrink-0"
            />

            {label}
          </button>
        ))}
      </div>

      {/* Sign out */}

      <div className="border-t border-warm-100 py-1">
        <button
          onClick={() => {
            dispatch({
              type: "TOGGLE_PROFILE",
            });

            dispatch({
              type: "AUTH_LOGOUT",
            });
          }}
          className="
            w-full
            flex items-center gap-2.5
            px-3 py-2.5
            text-sm
            text-warm-700
            hover:bg-red-50
            hover:text-red-700
            transition-colors
          "
        >
          <LogOut
            size={14}
            className="text-warm-400 shrink-0"
          />

          Sign Out
        </button>
      </div>
    </div>
  );
}