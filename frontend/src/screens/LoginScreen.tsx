import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CloudRain,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  UserRound,
} from "lucide-react";

interface LoginScreenProps {
  role: "citizen" | "authority";
  onBack: () => void;
  onLogin: () => void;
}

export default function LoginScreen({
  role,
  onBack,
  onLogin,
}: LoginScreenProps) {
  const isAuthority = role === "authority";

  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !identifier.trim() ||
      !password.trim()
    ) {
      setError(
        "Please enter your ID and password."
      );
      return;
    }

    setError("");
    onLogin();
  };

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Header */}
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

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-warm-400">
            {isAuthority ? (
              <>
                <Shield size={12} />
                Secure Authority Access
              </>
            ) : (
              <>
                <UserRound size={12} />
                Citizen Access
              </>
            )}
          </div>
        </div>
      </header>

      {/* Login area */}
      <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-warm-500 hover:text-warm-900 mb-7 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to access selection
          </button>

          {/* Card */}
          <div className="bg-white border border-warm-200 rounded-sm">
            {/* Card header */}
            <div className="px-6 sm:px-7 pt-7 pb-6 border-b border-warm-100">
              <div
                className={`w-11 h-11 flex items-center justify-center rounded-sm mb-5 ${
                  isAuthority
                    ? "bg-maroon-50"
                    : "bg-warm-100"
                }`}
              >
                {isAuthority ? (
                  <Building2
                    size={22}
                    className="text-maroon-700"
                  />
                ) : (
                  <UserRound
                    size={22}
                    className="text-warm-700"
                  />
                )}
              </div>

              <div className="text-[10px] font-mono uppercase tracking-wider text-warm-400 mb-1">
                {isAuthority
                  ? "Authority portal"
                  : "Citizen portal"}
              </div>

              <h1 className="text-2xl font-bold text-warm-900">
                {isAuthority
                  ? "Authority Login"
                  : "Citizen Login"}
              </h1>

              <p className="text-sm text-warm-500 mt-2 leading-relaxed">
                {isAuthority
                  ? "Sign in to access municipal flood monitoring and emergency operations."
                  : "Sign in to access local flood forecasts, reports and safe routes."}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-7"
            >
              {/* Identifier */}
              <div className="mb-4">
                <label
                  htmlFor="identifier"
                  className="block text-xs font-medium text-warm-700 mb-1.5"
                >
                  {isAuthority
                    ? "Authority ID"
                    : "User ID or Email"}
                </label>

                <div className="relative">
                  {isAuthority ? (
                    <Shield
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
                    />
                  ) : (
                    <Mail
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
                    />
                  )}

                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) =>
                      setIdentifier(
                        e.target.value
                      )
                    }
                    placeholder={
                      isAuthority
                        ? "Enter authority ID"
                        : "Enter user ID or email"
                    }
                    autoComplete="username"
                    className="w-full border border-warm-200 rounded-sm pl-9 pr-3 py-2.5 text-sm text-warm-800 placeholder:text-warm-300 focus:border-maroon-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-warm-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-[10px] text-maroon-700 hover:text-maroon-900 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full border border-warm-200 rounded-sm pl-9 pr-10 py-2.5 text-sm text-warm-800 placeholder:text-warm-300 focus:border-maroon-600 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* Login */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-maroon-700 text-white text-sm font-medium rounded-sm hover:bg-maroon-800 transition-colors"
              >
                {isAuthority
                  ? "Secure Login"
                  : "Login"}

                <ArrowRight size={14} />
              </button>

              {/* Prototype notice */}
              <div className="mt-5 flex items-start gap-2 border-t border-warm-100 pt-4">
                <Lock
                  size={12}
                  className="text-warm-400 mt-0.5 shrink-0"
                />

                <p className="text-[10px] text-warm-400 leading-relaxed">
                  {isAuthority
                    ? "Authority authentication is currently a prototype interface. Production deployment will use backend authentication and role-based access control."
                    : "Citizen authentication is currently a prototype interface. Production deployment will use backend authentication and protected user sessions."}
                </p>
              </div>
            </form>
          </div>

          {/* Bottom */}
          <div className="text-center mt-5">
            <div className="text-[9px] font-mono uppercase tracking-wider text-warm-400">
              UrbanFlo · Flood intelligence before inundation
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}