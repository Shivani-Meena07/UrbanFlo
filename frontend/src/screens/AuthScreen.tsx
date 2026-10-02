import {
  Shield,
  Users,
  ArrowRight,
  Map,
  Building2,
  CloudRain,
} from "lucide-react";

interface AuthScreenProps {
  onSelectRole: (role: "citizen" | "authority") => void;
}

export default function AuthScreen({
  onSelectRole,
}: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Top brand bar */}
      <header className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-maroon-700 flex items-center justify-center rounded-sm">
              <CloudRain
                size={19}
                className="text-white"
              />
            </div>

            <div>
              <div className="text-base font-bold tracking-tight">
                UrbanFlo
              </div>

              <div className="text-[9px] font-mono uppercase tracking-wider text-warm-400">
                Urban Flood Intelligence
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-[10px] font-mono text-warm-400 uppercase tracking-wider">
            Disaster Management Platform
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl">
          {/* Intro */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-warm-200 bg-white rounded-sm mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />

              <span className="text-[10px] font-mono uppercase tracking-wider text-warm-500">
                Flood intelligence system
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-warm-900">
              Welcome to UrbanFlo
            </h1>

            <p className="max-w-xl mx-auto mt-3 text-sm sm:text-base text-warm-500 leading-relaxed">
              Real-time urban flood intelligence for
              citizens, emergency teams and municipal
              authorities.
            </p>
          </div>

          {/* Role selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
            {/* Citizen */}
            <button
              onClick={() =>
                onSelectRole("citizen")
              }
              className="group text-left bg-white border border-warm-200 hover:border-maroon-300 transition-all duration-200 rounded-sm p-6 sm:p-7"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-12 h-12 bg-warm-100 flex items-center justify-center rounded-sm group-hover:bg-maroon-50 transition-colors">
                  <Users
                    size={23}
                    className="text-warm-700 group-hover:text-maroon-700"
                  />
                </div>

                <ArrowRight
                  size={18}
                  className="text-warm-300 group-hover:text-maroon-700 group-hover:translate-x-1 transition-all"
                />
              </div>

              <div className="text-[10px] font-mono uppercase tracking-wider text-warm-400 mb-1">
                Public access
              </div>

              <h2 className="text-xl font-bold text-warm-900">
                Citizen
              </h2>

              <p className="text-sm text-warm-500 leading-relaxed mt-2 max-w-md">
                Monitor local flood risk, rainfall,
                predicted water depth and safe travel
                routes. Report flooding and drainage
                problems from the ground.
              </p>

              <div className="mt-6 pt-4 border-t border-warm-100">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono text-warm-500">
                  <span className="flex items-center gap-1.5">
                    <Map size={11} />
                    Live map
                  </span>

                  <span className="flex items-center gap-1.5">
                    <CloudRain size={11} />
                    Forecast
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Shield size={11} />
                    Safe routes
                  </span>
                </div>
              </div>
            </button>

            {/* Authority */}
            <button
              onClick={() =>
                onSelectRole("authority")
              }
              className="group text-left bg-white border border-warm-200 hover:border-maroon-300 transition-all duration-200 rounded-sm p-6 sm:p-7"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-12 h-12 bg-maroon-50 flex items-center justify-center rounded-sm">
                  <Building2
                    size={23}
                    className="text-maroon-700"
                  />
                </div>

                <ArrowRight
                  size={18}
                  className="text-warm-300 group-hover:text-maroon-700 group-hover:translate-x-1 transition-all"
                />
              </div>

              <div className="text-[10px] font-mono uppercase tracking-wider text-warm-400 mb-1">
                Secure operations
              </div>

              <h2 className="text-xl font-bold text-warm-900">
                Authority
              </h2>

              <p className="text-sm text-warm-500 leading-relaxed mt-2 max-w-md">
                Monitor city-wide flood conditions,
                verify incidents, inspect drainage
                stress and coordinate emergency field
                response.
              </p>

              <div className="mt-6 pt-4 border-t border-warm-100">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono text-warm-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={11} />
                    Command centre
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Shield size={11} />
                    Incident control
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Map size={11} />
                    City operations
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Bottom information */}
          <div className="mt-8 text-center">
            <p className="text-[10px] font-mono text-warm-400">
              SELECT YOUR ACCESS TYPE TO CONTINUE
            </p>

            <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-warm-400">
              <span>
                Rainfall intelligence
              </span>

              <span className="text-warm-200">
                /
              </span>

              <span>
                Drainage modelling
              </span>

              <span className="text-warm-200">
                /
              </span>

              <span>
                Flood nowcasting
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}