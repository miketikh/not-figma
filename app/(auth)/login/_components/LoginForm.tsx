"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getAuthErrorMessage, validateEmail } from "../../_lib/auth-helpers";

export default function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/canvas");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in to continue to CollabCanvas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

