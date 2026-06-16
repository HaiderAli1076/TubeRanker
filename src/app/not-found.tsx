import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-gray-950">404</h1>
        <h2 className="mt-2 text-xl font-bold text-gray-800">Page Not Found</h2>
        <p className="mt-4 text-gray-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
