import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Github,
  Twitter,
  Linkedin,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-bold text-white">DrugVerify</h3>
                <p className="text-sm text-neutral-400">Authenticity System</p>
              </div>
            </div>
            <p className="text-neutral-400 mb-4 max-w-md">
              Protecting public health through advanced drug authentication
              technology. Our blockchain-powered system ensures medication
              safety worldwide.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/scan"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Scan Drug
                </Link>
              </li>
              <li>
                <Link
                  to="/verify"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Verify
                </Link>
              </li>
              <li>
                <Link
                  to="/reports"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Reports
                </Link>
              </li>
              <li>
                <Link
                  to="/supply-chain"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  Supply Chain
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-neutral-400" />
                <span className="text-neutral-400">support@drugverify.com</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-neutral-400" />
                <span className="text-neutral-400">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-0.5 text-neutral-400" />
                <span className="text-neutral-400">
                  123 Healthcare Blvd
                  <br />
                  Medical District, NY 10001
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-neutral-800 mt-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-neutral-400 text-sm mb-4 md:mb-0">
              © 2024 DrugVerify. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link
                to="/privacy"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/security"
                className="text-neutral-400 hover:text-white transition-colors"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
