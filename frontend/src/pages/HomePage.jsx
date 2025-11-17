import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Scan,
  FileText,
  BarChart3,
  Users,
  CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const HomePage = () => {
  const features = [
    {
      icon: Scan,
      title: "Drug Verification",
      description:
        "Scan QR codes or barcodes to instantly verify drug authenticity",
      link: "/scan",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Shield,
      title: "Supply Chain Tracking",
      description:
        "Track complete supply chain history with blockchain technology",
      link: "/supply-chain",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: FileText,
      title: "Report Counterfeits",
      description:
        "Report suspicious or counterfeit drugs to help protect others",
      link: "/reports/create",
      color: "bg-red-100 text-red-600",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "View comprehensive analytics and system reports",
      link: "/admin",
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const stats = [
    { label: "Drugs Verified", value: "50,000+" },
    { label: "Reports Filed", value: "1,200+" },
    { label: "Users Protected", value: "25,000+" },
    { label: "Countries Covered", value: "15+" },
  ];

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="pt-8 pb-12">
        <div className="w-full px-4">
          <div className="text-center max-w-6xl mx-auto">
            <motion.h1
              className="text-3xl md:text-5xl font-bold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Secure Drug
              <span className="text-blue-600"> Authenticity</span>
              <br />
              Verification System
            </motion.h1>

            <motion.p
              className="text-lg text-gray-600 mb-6 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Protect yourself and others from counterfeit medications with our
              advanced verification system powered by blockchain technology and
              real-time scanning.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link to="/scan" className="btn btn-primary btn-lg">
                <Scan className="w-5 h-5 mr-2" />
                Start Scanning
              </Link>
              <Link to="/verify" className="btn btn-outline btn-lg">
                Learn More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="w-full px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="w-full px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              Our comprehensive platform provides everything you need to verify
              drug authenticity and track supply chains.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div
                  className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <Link
                  to={feature.link}
                  className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                >
                  Learn more
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12">
        <div className="w-full px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Simple steps to verify your medications
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Scan or Upload
              </h3>
              <p className="text-gray-600">
                Use your camera to scan QR codes or barcodes, or upload an image
                of the medication package.
              </p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Verify Authenticity
              </h3>
              <p className="text-gray-600">
                Our system instantly checks the drug against our secure database
                and blockchain records.
              </p>
            </motion.div>

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Get Results
              </h3>
              <p className="text-gray-600">
                Receive instant verification results with complete supply chain
                history and safety information.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-blue-600">
        <div className="w-full px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Verify Your Medications?
            </h2>
            <p className="text-lg text-blue-100 mb-6 max-w-4xl mx-auto">
              Join thousands of users who trust our platform to ensure their
              medication safety. Start verifying today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/scan" className="btn btn-secondary btn-lg">
                <Scan className="w-5 h-5 mr-2" />
                Start Verification
              </Link>
              <Link
                to="/register"
                className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-blue-600"
              >
                <Users className="w-5 h-5 mr-2" />
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
