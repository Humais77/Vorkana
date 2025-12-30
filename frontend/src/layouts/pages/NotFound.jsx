import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/useAuthStore";

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  return (
    <>
        <title>404 – Page Not Found | YourApp</title>
        <meta
          name="description"
          content="The page you’re looking for doesn’t exist or has been moved."
        />
        <meta name="robots" content="noindex, nofollow" />

      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-xl text-center"
        >
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-7xl font-extrabold text-gray-900"
          >
            404
          </motion.h1>

          <p className="mt-4 text-lg text-gray-600">
            Sorry, the page you’re looking for doesn’t exist.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
            >
              Go Back
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/"
                className="px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition"
              >
                Back to Home
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default NotFound;
