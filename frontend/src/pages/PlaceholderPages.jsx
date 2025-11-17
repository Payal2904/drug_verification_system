import React from "react";
import {
  Construction,
  User,
  FileText,
  Package,
  BarChart3,
  Users,
  Settings,
  Search,
  Shield,
} from "lucide-react";

// Generic placeholder component
const PlaceholderPage = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              {title}
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-8">
            {children || (
              <div className="text-center py-12">
                <Construction className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Coming Soon
                </h3>
                <p className="text-neutral-600">
                  This feature is currently under development.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Authentication Pages
export const RegisterPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="max-w-md w-full mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Create Account
        </h1>
        <p className="text-neutral-600 mb-6">Sign up for a new account</p>

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name</label>
              <input type="text" className="input" placeholder="First name" />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input type="text" className="input" placeholder="Last name" />
            </div>
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="form-label">Role</label>
            <select className="input">
              <option value="user">User</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="manufacturer">Manufacturer</option>
            </select>
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="input"
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Create Account
          </button>
        </form>

        <p className="text-center text-neutral-600 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            Sign in
          </a>
        </p>
      </div>
    </div>
  </div>
);

export const ProfilePage = () => (
  <PlaceholderPage
    title="User Profile"
    description="Manage your account settings and personal information"
    icon={User}
  >
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Personal Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">First Name</label>
            <input type="text" className="input" defaultValue="John" />
          </div>
          <div>
            <label className="form-label">Last Name</label>
            <input type="text" className="input" defaultValue="Doe" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="input"
              defaultValue="john.doe@example.com"
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Account Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">Role</label>
            <select className="input" defaultValue="user">
              <option value="user">User</option>
              <option value="pharmacist">Pharmacist</option>
            </select>
          </div>
          <div>
            <label className="form-label">Organization</label>
            <input
              type="text"
              className="input"
              placeholder="Your organization"
            />
          </div>
          <div>
            <label className="form-label">License Number</label>
            <input
              type="text"
              className="input"
              placeholder="Professional license number"
            />
          </div>
        </div>
      </div>
    </div>
    <div className="mt-8 pt-8 border-t border-neutral-200">
      <button className="btn btn-primary">Save Changes</button>
    </div>
  </PlaceholderPage>
);

// Verification Pages
export const VerificationPage = () => (
  <PlaceholderPage
    title="Drug Verification"
    description="Enter drug information manually to verify authenticity"
    icon={Shield}
  >
    <div className="max-w-lg mx-auto">
      <form className="space-y-6">
        <div>
          <label className="form-label">Drug Name</label>
          <input type="text" className="input" placeholder="Enter drug name" />
        </div>

        <div>
          <label className="form-label">Batch Number</label>
          <input
            type="text"
            className="input"
            placeholder="Enter batch number"
          />
        </div>

        <div>
          <label className="form-label">Drug Code</label>
          <input type="text" className="input" placeholder="Enter drug code" />
        </div>

        <div>
          <label className="form-label">Manufacturer</label>
          <input
            type="text"
            className="input"
            placeholder="Enter manufacturer name"
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Verify Drug
        </button>
      </form>
    </div>
  </PlaceholderPage>
);

// Reports Pages
export const ReportsPage = () => (
  <PlaceholderPage
    title="Reports"
    description="View and manage counterfeit drug reports"
    icon={FileText}
  >
    <div className="mb-6 flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">My Reports</h3>
        <p className="text-neutral-600">Track your submitted reports</p>
      </div>
      <a href="/reports/create" className="btn btn-primary">
        Create Report
      </a>
    </div>

    <div className="bg-neutral-50 rounded-lg p-8 text-center">
      <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
      <h4 className="text-lg font-medium text-neutral-900 mb-2">
        No reports yet
      </h4>
      <p className="text-neutral-600 mb-4">
        You haven't submitted any reports.
      </p>
      <a href="/reports/create" className="btn btn-primary">
        Submit Your First Report
      </a>
    </div>
  </PlaceholderPage>
);

export const CreateReportPage = () => (
  <PlaceholderPage
    title="Report Counterfeit Drug"
    description="Help protect others by reporting suspicious or counterfeit medications"
    icon={FileText}
  >
    <form className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Drug Name *</label>
          <input
            type="text"
            className="input"
            placeholder="Name of the drug"
            required
          />
        </div>
        <div>
          <label className="form-label">Suspected Batch Number</label>
          <input
            type="text"
            className="input"
            placeholder="Batch number if available"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Report Type *</label>
        <select className="input" required>
          <option value="">Select report type</option>
          <option value="counterfeit">Counterfeit</option>
          <option value="tampered">Tampered</option>
          <option value="expired_sold">Expired drug sold as new</option>
          <option value="mislabeled">Mislabeled</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="form-label">Description *</label>
        <textarea
          className="input"
          rows="4"
          placeholder="Describe the issue in detail..."
          required
        ></textarea>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Location Found</label>
          <input
            type="text"
            className="input"
            placeholder="Where was this found?"
          />
        </div>
        <div>
          <label className="form-label">Purchase Location</label>
          <input
            type="text"
            className="input"
            placeholder="Where was this purchased?"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Evidence Photos</label>
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
          <p className="text-neutral-600">
            Drag and drop photos here, or click to select
          </p>
          <input type="file" multiple accept="image/*" className="hidden" />
        </div>
      </div>

      <div className="flex gap-4">
        <button type="submit" className="btn btn-primary">
          Submit Report
        </button>
        <button type="button" className="btn btn-outline">
          Save as Draft
        </button>
      </div>
    </form>
  </PlaceholderPage>
);

export const ReportDetailsPage = () => (
  <PlaceholderPage
    title="Report Details"
    description="View detailed information about this report"
    icon={FileText}
  >
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-neutral-900">
            Report #12345
          </h3>
          <p className="text-neutral-600">Submitted on March 15, 2024</p>
        </div>
        <span className="badge badge-warning">Under Investigation</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-neutral-900 mb-4">
            Report Information
          </h4>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm font-medium text-neutral-500">
                Drug Name
              </dt>
              <dd className="text-neutral-900">Paracetamol 500mg</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500">
                Report Type
              </dt>
              <dd className="text-neutral-900">Counterfeit</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500">
                Location Found
              </dt>
              <dd className="text-neutral-900">Local Pharmacy, Main Street</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-900 mb-4">
            Investigation Status
          </h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-neutral-900">Report received</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-neutral-900">
                Initial review completed
              </span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-yellow-500 rounded-full mr-3"></div>
              <span className="text-sm text-neutral-900">
                Under investigation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PlaceholderPage>
);

// Supply Chain Page
export const SupplyChainPage = () => (
  <PlaceholderPage
    title="Supply Chain Tracking"
    description="Track drugs through the entire supply chain using blockchain technology"
    icon={Package}
  >
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Blockchain Status
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1,234</div>
            <div className="text-sm text-neutral-600">Total Blocks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">567</div>
            <div className="text-sm text-neutral-600">Unique Batches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">89</div>
            <div className="text-sm text-neutral-600">Active Entities</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Track a Batch
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            className="input flex-1"
            placeholder="Enter batch number or QR code..."
          />
          <button className="btn btn-primary">Track</button>
        </div>
      </div>
    </div>
  </PlaceholderPage>
);

// Admin Pages
export const AdminDashboard = () => (
  <PlaceholderPage
    title="Admin Dashboard"
    description="System overview and management tools"
    icon={BarChart3}
  >
    <div className="grid lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <h3 className="text-sm font-medium opacity-90">Total Users</h3>
        <p className="text-3xl font-bold">1,234</p>
      </div>
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
        <h3 className="text-sm font-medium opacity-90">Verifications Today</h3>
        <p className="text-3xl font-bold">89</p>
      </div>
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
        <h3 className="text-sm font-medium opacity-90">Pending Reports</h3>
        <p className="text-3xl font-bold">12</p>
      </div>
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
        <h3 className="text-sm font-medium opacity-90">Critical Alerts</h3>
        <p className="text-3xl font-bold">3</p>
      </div>
    </div>

    <div className="grid lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-900">New user registration</span>
            <span className="text-sm text-neutral-500">2 min ago</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <span className="text-neutral-900">
              Drug verification completed
            </span>
            <span className="text-sm text-neutral-500">5 min ago</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-900">Database</span>
            <span className="badge badge-success">Online</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-900">Blockchain</span>
            <span className="badge badge-success">Synced</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-900">API</span>
            <span className="badge badge-success">Healthy</span>
          </div>
        </div>
      </div>
    </div>
  </PlaceholderPage>
);

export const UserManagement = () => (
  <PlaceholderPage
    title="User Management"
    description="Manage system users and their permissions"
    icon={Users}
  />
);

export const DrugManagement = () => (
  <PlaceholderPage
    title="Drug Management"
    description="Manage drugs, batches, and manufacturer information"
    icon={Package}
  />
);

export const BatchManagement = () => (
  <PlaceholderPage
    title="Batch Management"
    description="Manage drug batches and generate QR codes"
    icon={Package}
  />
);

export const SystemSettings = () => (
  <PlaceholderPage
    title="System Settings"
    description="Configure system settings and preferences"
    icon={Settings}
  />
);

// 404 Page
export const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-neutral-50">
    <div className="text-center">
      <div className="text-6xl font-bold text-neutral-300 mb-4">404</div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">
        Page Not Found
      </h1>
      <p className="text-neutral-600 mb-8">
        The page you're looking for doesn't exist.
      </p>
      <a href="/" className="btn btn-primary">
        Go Home
      </a>
    </div>
  </div>
);
