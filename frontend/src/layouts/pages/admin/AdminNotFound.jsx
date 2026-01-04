import { Link } from "react-router-dom";

const AdminNotFound = () => {
  return (
    <>
        <title>Admin – Page Not Found</title>
        <meta name="robots" content="noindex, nofollow" />

      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl font-bold text-red-600">404</h1>
        <p className="mt-4 text-gray-600">
          This admin page does not exist.
        </p>

        <Link
          to="/admin"
          className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Back to Admin Dashboard
        </Link>
      </div>
    </>
  );
};

export default AdminNotFound;
