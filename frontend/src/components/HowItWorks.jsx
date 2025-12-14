// components/home/HowItWorks.jsx
const HowItWorks = () => (
  <section className="py-16 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-12">How Vorkana Works</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-blue-600">1</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Browse Services</h3>
          <p className="text-gray-600">Explore thousands of services or post your project</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-green-600">2</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Connect & Collaborate</h3>
          <p className="text-gray-600">Message freelancers, discuss details, and agree on terms</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-purple-600">3</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">Get Work Done</h3>
          <p className="text-gray-600">Pay securely and receive high-quality work on time</p>
        </div>
      </div>
    </div>
  </section>
);
export default HowItWorks