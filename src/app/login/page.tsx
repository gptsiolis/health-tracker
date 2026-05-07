import Link from "next/link";
import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-950">Log in</h1>
        <p className="text-sm text-slate-600">
          Use the email and password for your private health tracker.
        </p>
      </div>

      <form action={login} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Email</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            name="email"
            type="email"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-800">Password</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            name="password"
            type="password"
            required
          />
        </label>

        {message ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </p>
        ) : null}

        <button
          className="w-full rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
          type="submit"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-medium text-teal-800" href="/signup">
          Sign up
        </Link>
      </p>
    </main>
  );
}
