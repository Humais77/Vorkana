import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const CallToAction = ({ onSignupClick }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleClick = () => {
    if (isAuthenticated) {
      // user already logged in
      navigate("/services"); // or any page you want
    } else {
      // user not logged in → open signup modal
      if (onSignupClick) onSignupClick();
    }
  };

  return (
    <section className="px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl bg-[#5a1b2c] px-8 py-12 md:py-16 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-8">
            Freelance services at your{" "}
            <span className="text-orange-400">fingertips</span>
          </h2>

          <button
            onClick={handleClick}
            className="inline-block bg-white text-gray-900 font-medium px-8 py-3 rounded-md shadow hover:bg-gray-100 transition"
          >
            {isAuthenticated ? "Explore Services" : "Join Vorkanna"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
