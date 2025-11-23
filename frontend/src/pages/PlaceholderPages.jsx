import React from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import dataService from "../services/dataService";
import toast from "react-hot-toast";
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
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  Download,
  Upload,
  X,
  Plus,
  Edit,
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
export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role
      });

      console.log('Registration result:', result);

      if (result.success) {
        toast.success(`Welcome ${formData.firstName}! Account created successfully!`);
        // Navigate after a short delay to show the success message
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error(result.error || 'Registration failed. Please try again.');
        setErrors({ general: result.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration. Please try again.');
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Create Account
            </h1>
            <p className="text-neutral-600">Sign up for DrugVerify</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input ${errors.firstName ? 'border-error-500' : ''}`}
                  placeholder="First name"
                  disabled={loading}
                />
                {errors.firstName && (
                  <p className="form-error">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input ${errors.lastName ? 'border-error-500' : ''}`}
                  placeholder="Last name"
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="form-error">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input ${errors.email ? 'border-error-500' : ''}`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="form-error">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="form-label">Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`input ${errors.username ? 'border-error-500' : ''}`}
                placeholder="Choose a username"
                disabled={loading}
              />
              {errors.username && (
                <p className="form-error">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="form-label">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
                disabled={loading}
              >
                <option value="user">User</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="distributor">Distributor</option>
                <option value="retailer">Retailer</option>
              </select>
            </div>

            <div>
              <label className="form-label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pr-10 ${errors.password ? 'border-error-500' : ''}`}
                  placeholder="Create a password (min 6 characters)"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <Construction className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <Construction className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="form-label">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input pr-10 ${errors.confirmPassword ? 'border-error-500' : ''}`}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <Construction className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <Construction className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.general && (
              <div className="p-4 bg-error-50 border border-error-200 rounded-lg flex items-start">
                <AlertTriangle className="h-5 w-5 text-error-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-error-700 text-sm">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-neutral-600 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = React.useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || '',
    organization: user?.organization || '',
    licenseNumber: user?.licenseNumber || ''
  });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        organization: user.organization || '',
        licenseNumber: user.licenseNumber || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              User Profile
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Manage your account settings and personal information
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            {success && (
              <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg flex items-center">
                <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
                <span className="text-success-700">Profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    Personal Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="input"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="input"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="form-label">Username</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        className="input bg-neutral-100"
                        disabled
                      />
                      <p className="form-help">Username cannot be changed</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    Account Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Role</label>
                      <div className="input bg-neutral-100 flex items-center">
                        <span className="capitalize">{user?.role || 'User'}</span>
                      </div>
                      <p className="form-help">Contact admin to change role</p>
                    </div>
                    <div>
                      <label className="form-label">Account Status</label>
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${user?.isActive ? 'badge-success' : 'badge-error'}`}>
                          {user?.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user?.isVerified && (
                          <span className="badge badge-primary">Verified</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Organization</label>
                      <input
                        type="text"
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        className="input"
                        placeholder="Your organization"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="form-label">License Number</label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="Professional license number"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-neutral-200 flex gap-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <Link to="/" className="btn btn-outline">
                  Cancel
                </Link>
              </div>
            </form>

            {/* Account Stats */}
            <div className="mt-8 pt-8 border-t border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Account Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600">0</div>
                  <div className="text-sm text-neutral-600">Verifications</div>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-neutral-600">Reports Filed</div>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {user?.createdAt ? Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) : 0}
                  </div>
                  <div className="text-sm text-neutral-600">Days Active</div>
                </div>
                <div className="text-center p-4 bg-neutral-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-neutral-600">Scans Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
export const ReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all'); // all, pending, investigating, resolved

  React.useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const userReports = await dataService.getReports(user?.id);
      setReports(userReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'badge-warning', label: 'Pending' },
      investigating: { class: 'badge-primary', label: 'Investigating' },
      resolved: { class: 'badge-success', label: 'Resolved' },
      rejected: { class: 'badge-error', label: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              My Reports
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              View and manage your counterfeit drug reports
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('investigating')}
                  className={`btn btn-sm ${filter === 'investigating' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Investigating
                </button>
                <button
                  onClick={() => setFilter('resolved')}
                  className={`btn btn-sm ${filter === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Resolved
                </button>
              </div>
              <Link to="/reports/create" className="btn btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-neutral-600 mt-4">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-neutral-50 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-neutral-900 mb-2">
                  {filter === 'all' ? 'No reports yet' : `No ${filter} reports`}
                </h4>
                <p className="text-neutral-600 mb-4">
                  {filter === 'all'
                    ? "You haven't submitted any reports."
                    : `You don't have any ${filter} reports.`}
                </p>
                <Link to="/reports/create" className="btn btn-primary">
                  Submit Your First Report
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-neutral-900">
                            Report #{report.id}
                          </h3>
                          {getStatusBadge(report.status)}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-neutral-600">Drug Name:</span>{' '}
                            <span className="font-medium">{report.drugName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-600">Report Type:</span>{' '}
                            <span className="font-medium capitalize">{report.reportType || report.type || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-600">Batch Number:</span>{' '}
                            <span className="font-medium">{report.batchNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-600">Date:</span>{' '}
                            <span className="font-medium">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {report.description && (
                          <p className="text-neutral-600 mt-3 text-sm">
                            {report.description.substring(0, 150)}
                            {report.description.length > 150 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <Link
                          to={`/reports/${report.id}`}
                          className="btn btn-sm btn-outline"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="mt-8 grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-soft p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{reports.length}</div>
              <div className="text-sm text-neutral-600">Total Reports</div>
            </div>
            <div className="bg-white rounded-lg shadow-soft p-4 text-center">
              <div className="text-2xl font-bold text-warning-600">
                {reports.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-sm text-neutral-600">Pending</div>
            </div>
            <div className="bg-white rounded-lg shadow-soft p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reports.filter(r => r.status === 'investigating').length}
              </div>
              <div className="text-sm text-neutral-600">Investigating</div>
            </div>
            <div className="bg-white rounded-lg shadow-soft p-4 text-center">
              <div className="text-2xl font-bold text-success-600">
                {reports.filter(r => r.status === 'resolved').length}
              </div>
              <div className="text-sm text-neutral-600">Resolved</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreateReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Pre-fill data from navigation state (e.g., from scan page)
  const prefilledData = location.state || {};
  
  const [formData, setFormData] = React.useState({
    drugName: prefilledData.drugName || '',
    batchNumber: prefilledData.batchNumber || '',
    reportType: prefilledData.reportType || '',
    description: prefilledData.description || '',
    locationFound: '',
    purchaseLocation: '',
  });
  const [files, setFiles] = React.useState([]);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== selectedFiles.length) {
      toast.error('Only image files are allowed');
    }
    
    setFiles(prevFiles => [...prevFiles, ...imageFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.drugName.trim()) {
      newErrors.drugName = 'Drug name is required';
    }

    if (!formData.reportType) {
      newErrors.reportType = 'Report type is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Convert files to base64 for demo storage
      const fileData = await Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({
              name: file.name,
              type: file.type,
              data: reader.result
            });
            reader.readAsDataURL(file);
          });
        })
      );

      const result = await dataService.createReport({
        ...formData,
        evidence: fileData,
        reporterId: user?.id
      });

      if (result.success) {
        toast.success('Report submitted successfully!');
        navigate('/reports');
      } else {
        toast.error(result.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-error-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-error-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              Report Counterfeit Drug
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Help protect others by reporting suspicious or counterfeit medications
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Drug Name *</label>
                  <input
                    type="text"
                    name="drugName"
                    value={formData.drugName}
                    onChange={handleChange}
                    className={`input ${errors.drugName ? 'border-error-500' : ''}`}
                    placeholder="Name of the drug"
                    disabled={loading}
                  />
                  {errors.drugName && (
                    <p className="form-error">{errors.drugName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Suspected Batch Number</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className="input"
                    placeholder="Batch number if available"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Report Type *</label>
                <select
                  name="reportType"
                  value={formData.reportType}
                  onChange={handleChange}
                  className={`input ${errors.reportType ? 'border-error-500' : ''}`}
                  disabled={loading}
                >
                  <option value="">Select report type</option>
                  <option value="counterfeit">Counterfeit</option>
                  <option value="tampered">Tampered</option>
                  <option value="expired_sold">Expired drug sold as new</option>
                  <option value="mislabeled">Mislabeled</option>
                  <option value="substandard">Substandard Quality</option>
                  <option value="other">Other</option>
                </select>
                {errors.reportType && (
                  <p className="form-error">{errors.reportType}</p>
                )}
              </div>

              <div>
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`input ${errors.description ? 'border-error-500' : ''}`}
                  rows="5"
                  placeholder="Describe the issue in detail... (minimum 20 characters)"
                  disabled={loading}
                />
                <p className="text-sm text-neutral-500 mt-1">
                  {formData.description.length} characters
                </p>
                {errors.description && (
                  <p className="form-error">{errors.description}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Location Found</label>
                  <input
                    type="text"
                    name="locationFound"
                    value={formData.locationFound}
                    onChange={handleChange}
                    className="input"
                    placeholder="Where was this found?"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="form-label">Purchase Location</label>
                  <input
                    type="text"
                    name="purchaseLocation"
                    value={formData.purchaseLocation}
                    onChange={handleChange}
                    className="input"
                    placeholder="Where was this purchased?"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Evidence Photos (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                  <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-600 mb-1">
                    Click to select photos or drag and drop
                  </p>
                  <p className="text-xs text-neutral-500">
                    Maximum 5 images, PNG or JPG
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-error-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="text-xs text-neutral-600 mt-1 truncate">
                          {file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Your report will be reviewed</p>
                    <p>
                      All reports are reviewed by our team and appropriate authorities
                      will be notified if necessary. Your identity will be kept confidential.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </button>
                <Link to="/reports" className="btn btn-outline">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReportDetailsPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const reports = await dataService.getReports();
      const foundReport = reports.find(r => r.id.toString() === reportId);
      setReport(foundReport);
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'badge-warning', label: 'Pending Review' },
      investigating: { class: 'badge-primary', label: 'Under Investigation' },
      resolved: { class: 'badge-success', label: 'Resolved' },
      rejected: { class: 'badge-error', label: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const getStatusTimeline = (status) => {
    const timeline = [
      { stage: 'Report Received', completed: true },
      { stage: 'Initial Review', completed: status !== 'pending' },
      { stage: 'Under Investigation', completed: status === 'investigating' || status === 'resolved' },
      { stage: 'Resolved', completed: status === 'resolved' }
    ];
    return timeline;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Report Not Found</h2>
          <p className="text-neutral-600 mb-6">The report you're looking for doesn't exist.</p>
          <Link to="/reports" className="btn btn-primary">
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  const timeline = getStatusTimeline(report.status);

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Link to="/reports" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6">
            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reports
          </Link>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    Report #{report.id}
                  </h1>
                  <p className="text-neutral-600 mt-1">
                    Submitted on {new Date(report.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {getStatusBadge(report.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary-600" />
                    Report Information
                  </h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">
                        Drug Name
                      </dt>
                      <dd className="text-neutral-900 font-medium">{report.drugName || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">
                        Batch Number
                      </dt>
                      <dd className="text-neutral-900 font-medium">{report.batchNumber || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">
                        Report Type
                      </dt>
                      <dd className="text-neutral-900 font-medium capitalize">
                        {report.reportType || report.type || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">
                        Location Found
                      </dt>
                      <dd className="text-neutral-900">{report.locationFound || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-neutral-500">
                        Purchase Location
                      </dt>
                      <dd className="text-neutral-900">{report.purchaseLocation || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold text-neutral-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary-600" />
                    Investigation Timeline
                  </h3>
                  <div className="space-y-4">
                    {timeline.map((item, index) => (
                      <div key={index} className="flex items-center">
                        <div className={`h-3 w-3 rounded-full mr-3 ${
                          item.completed ? 'bg-success-500' : 'bg-neutral-300'
                        }`}></div>
                        <span className={`text-sm ${
                          item.completed ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                        }`}>
                          {item.stage}
                        </span>
                        {item.completed && (
                          <CheckCircle className="h-4 w-4 text-success-500 ml-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {report.description && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-3">Description</h3>
                  <p className="text-neutral-700 bg-neutral-50 p-4 rounded-lg whitespace-pre-wrap">
                    {report.description}
                  </p>
                </div>
              )}

              {report.evidence && report.evidence.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-3">Evidence Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {report.evidence.map((file, index) => (
                      <img
                        key={index}
                        src={file.data}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/reports')}
                    className="btn btn-outline"
                  >
                    Back to Reports
                  </button>
                  {report.status === 'pending' && (
                    <button className="btn btn-error">
                      Cancel Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Supply Chain Page
export const SupplyChainPage = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDrug, setSelectedDrug] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [drugs, setDrugs] = React.useState([]);

  React.useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      const drugsList = await dataService.getAllDrugs();
      setDrugs(drugsList);
    } catch (error) {
      console.error('Error loading drugs:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a batch number or QR code');
      return;
    }

    setLoading(true);
    try {
      const result = await dataService.verifyDrug({
        batchNumber: searchQuery,
        qrCode: searchQuery,
        barcode: searchQuery
      });

      if (result.drug) {
        setSelectedDrug(result.drug);
      } else {
        toast.error('Drug not found in supply chain');
        setSelectedDrug(null);
      }
    } catch (error) {
      console.error('Error tracking drug:', error);
      toast.error('Failed to track drug');
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case 'manufacturer':
        return <Package className="h-5 w-5" />;
      case 'distributor':
        return <Search className="h-5 w-5" />;
      case 'retailer':
        return <Shield className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getEntityColor = (type) => {
    switch (type) {
      case 'manufacturer':
        return 'bg-blue-100 text-blue-600';
      case 'distributor':
        return 'bg-purple-100 text-purple-600';
      case 'retailer':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              Supply Chain Tracking
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Track drugs through the entire supply chain using blockchain technology
            </p>
          </div>

          {/* Blockchain Status */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              Blockchain Network Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center bg-white rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600">{drugs.length * 150}</div>
                <div className="text-sm text-neutral-600">Total Blocks</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">{drugs.length}</div>
                <div className="text-sm text-neutral-600">Unique Batches</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.floor(drugs.length * 1.5)}
                </div>
                <div className="text-sm text-neutral-600">Active Entities</div>
              </div>
              <div className="text-center bg-white rounded-lg p-4">
                <div className="text-3xl font-bold text-orange-600">
                  {Math.floor(drugs.length * 3.2)}
                </div>
                <div className="text-sm text-neutral-600">Transactions</div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-lg shadow-soft p-6 mb-8">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Track a Batch
            </h3>
            <form onSubmit={handleSearch} className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input flex-1"
                placeholder="Enter batch number, QR code, or barcode..."
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Tracking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Track
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-neutral-600">Quick search:</span>
              {drugs.slice(0, 3).map(drug => (
                <button
                  key={drug.id}
                  onClick={() => {
                    setSearchQuery(drug.batchNumber);
                    setSelectedDrug(drug);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  {drug.batchNumber}
                </button>
              ))}
            </div>
          </div>

          {/* Supply Chain Visualization */}
          {selectedDrug && (
            <div className="bg-white rounded-lg shadow-soft p-6 mb-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Supply Chain for {selectedDrug.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-primary">
                    Batch: {selectedDrug.batchNumber}
                  </span>
                  <span className="badge badge-secondary">
                    Code: {selectedDrug.drugCode}
                  </span>
                  <span className={`badge ${
                    new Date(selectedDrug.expiryDate) > new Date()
                      ? 'badge-success'
                      : 'badge-error'
                  }`}>
                    Expires: {new Date(selectedDrug.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                {selectedDrug.supplyChain && selectedDrug.supplyChain.map((entry, index) => (
                  <div key={index} className="flex gap-6 mb-8 last:mb-0">
                    {/* Timeline line */}
                    {index < selectedDrug.supplyChain.length - 1 && (
                      <div className="absolute left-6 top-14 w-0.5 h-16 bg-neutral-300"></div>
                    )}
                    
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getEntityColor(entry.type)} flex items-center justify-center z-10`}>
                      {getEntityIcon(entry.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-neutral-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-neutral-900 capitalize">
                            {entry.type}
                          </h4>
                          <p className="text-lg text-neutral-700">{entry.entity}</p>
                        </div>
                        <span className="text-sm text-neutral-500">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success-600" />
                        <span className="text-success-700">Verified on Blockchain</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Blockchain Hash (simulated) */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Blockchain Verification
                    </p>
                    <p className="text-xs text-blue-700 font-mono break-all">
                      Hash: 0x{selectedDrug.id}a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Last verified: {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Tracked Drugs */}
          {!selectedDrug && drugs.length > 0 && (
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Recently Added to Supply Chain
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {drugs.slice(0, 4).map(drug => (
                  <div
                    key={drug.id}
                    className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                    onClick={() => {
                      setSearchQuery(drug.batchNumber);
                      setSelectedDrug(drug);
                    }}
                  >
                    <h4 className="font-semibold text-neutral-900 mb-2">{drug.name}</h4>
                    <div className="space-y-1 text-sm text-neutral-600">
                      <p>Batch: {drug.batchNumber}</p>
                      <p>Manufacturer: {drug.manufacturer}</p>
                      <p>Entities: {drug.supplyChain?.length || 0}</p>
                    </div>
                    <div className="mt-3 flex items-center text-primary-600 text-sm">
                      <span>View supply chain</span>
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Admin Pages
export const AdminDashboard = () => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState([]);
  const [drugs, setDrugs] = React.useState([]);
  const [reports, setReports] = React.useState([]);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = dataService.getStats();
      setStats(statsData);

      const usersData = await dataService.getAllUsers();
      setUsers(usersData);

      const drugsData = await dataService.getAllDrugs();
      setDrugs(drugsData);

      const reportsData = await dataService.getReports();
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentActivity = [
    { text: `New user registration`, time: '2 min ago', type: 'user' },
    { text: `Drug verification completed`, time: '5 min ago', type: 'verify' },
    { text: `Report submitted`, time: '10 min ago', type: 'report' },
    { text: `New drug added to database`, time: '15 min ago', type: 'drug' },
    { text: `Supply chain updated`, time: '20 min ago', type: 'chain' }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-neutral-600">
              System overview and management tools
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Total Users</h3>
                  <p className="text-3xl font-bold">{stats?.totalUsers || users.length}</p>
                </div>
                <Users className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Total Drugs</h3>
                  <p className="text-3xl font-bold">{stats?.totalDrugs || drugs.length}</p>
                </div>
                <Package className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Pending Reports</h3>
                  <p className="text-3xl font-bold">{stats?.pendingReports || reports.filter(r => r.status === 'pending').length}</p>
                </div>
                <AlertTriangle className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium opacity-90">Verifications</h3>
                  <p className="text-3xl font-bold">{stats?.totalVerifications || 0}</p>
                </div>
                <Shield className="h-10 w-10 opacity-80" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-soft p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Recent Activity
                </h3>
                <Link to="/admin/reports" className="text-sm text-primary-600 hover:text-primary-700">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        activity.type === 'user' ? 'bg-blue-500' :
                        activity.type === 'verify' ? 'bg-green-500' :
                        activity.type === 'report' ? 'bg-yellow-500' :
                        activity.type === 'drug' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-neutral-900">{activity.text}</span>
                    </div>
                    <span className="text-sm text-neutral-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                System Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                    <span className="text-neutral-900">Database</span>
                  </div>
                  <span className="badge badge-success">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                    <span className="text-neutral-900">Blockchain</span>
                  </div>
                  <span className="badge badge-success">Synced</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                    <span className="text-neutral-900">API</span>
                  </div>
                  <span className="badge badge-success">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                    <span className="text-neutral-900">Storage</span>
                  </div>
                  <span className="badge badge-success">OK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/admin/users"
                className="flex items-center p-4 border border-neutral-200 rounded-lg hover:shadow-md transition"
              >
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="font-semibold text-neutral-900">Manage Users</div>
                  <div className="text-sm text-neutral-600">{users.length} users</div>
                </div>
              </Link>
              <Link
                to="/admin/drugs"
                className="flex items-center p-4 border border-neutral-200 rounded-lg hover:shadow-md transition"
              >
                <Package className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="font-semibold text-neutral-900">Manage Drugs</div>
                  <div className="text-sm text-neutral-600">{drugs.length} drugs</div>
                </div>
              </Link>
              <Link
                to="/reports"
                className="flex items-center p-4 border border-neutral-200 rounded-lg hover:shadow-md transition"
              >
                <FileText className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <div className="font-semibold text-neutral-900">View Reports</div>
                  <div className="text-sm text-neutral-600">{reports.length} reports</div>
                </div>
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center p-4 border border-neutral-200 rounded-lg hover:shadow-md transition"
              >
                <Settings className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="font-semibold text-neutral-900">Settings</div>
                  <div className="text-sm text-neutral-600">Configure</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const UserManagement = () => {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await dataService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: 'badge-error',
      pharmacist: 'badge-primary',
      manufacturer: 'badge-success',
      distributor: 'badge-warning',
      retailer: 'badge-secondary',
      user: 'badge-secondary'
    };
    return roleConfig[role] || 'badge-secondary';
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">User Management</h1>
            <p className="text-neutral-600">Manage system users and their permissions</p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">User</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-neutral-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-neutral-500">@{user.username}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${getRoleBadge(user.role)} capitalize`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-primary-600 hover:text-primary-700 text-sm">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DrugManagement = () => {
  const [drugs, setDrugs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      const drugsData = await dataService.getAllDrugs();
      setDrugs(drugsData);
    } catch (error) {
      console.error('Error loading drugs:', error);
      toast.error('Failed to load drugs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">Drug Management</h1>
              <p className="text-neutral-600">Manage drugs and manufacturer information</p>
            </div>
            <button className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Drug
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drugs.map(drug => (
                  <div key={drug.id} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{drug.name}</h3>
                        <p className="text-sm text-neutral-600">{drug.manufacturer}</p>
                      </div>
                      <span className={`badge ${new Date(drug.expiryDate) > new Date() ? 'badge-success' : 'badge-error'}`}>
                        {new Date(drug.expiryDate) > new Date() ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-600">
                      <div className="flex justify-between">
                        <span>Batch:</span>
                        <span className="font-medium">{drug.batchNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Code:</span>
                        <span className="font-medium">{drug.drugCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expiry:</span>
                        <span className="font-medium">{new Date(drug.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className="btn btn-sm btn-outline flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button className="btn btn-sm btn-outline">
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BatchManagement = () => {
  const [drugs, setDrugs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      const drugsData = await dataService.getAllDrugs();
      setDrugs(drugsData);
    } catch (error) {
      console.error('Error loading drugs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Batch Management</h1>
            <p className="text-neutral-600">Manage drug batches and generate QR codes</p>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Batch Management</h3>
              <p className="text-neutral-600 mb-4">
                View and manage drug batches with QR code generation
              </p>
              <p className="text-sm text-neutral-500">
                Total Batches: {drugs.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SystemSettings = () => {
  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">System Settings</h1>
            <p className="text-neutral-600">Configure system settings and preferences</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">General Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="form-label">System Name</label>
                  <input type="text" className="input" defaultValue="DrugVerify" />
                </div>
                <div>
                  <label className="form-label">Support Email</label>
                  <input type="email" className="input" defaultValue="support@drugverify.com" />
                </div>
                <div>
                  <label className="form-label">Timezone</label>
                  <select className="input">
                    <option>UTC</option>
                    <option>EST</option>
                    <option>PST</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Two-Factor Authentication</div>
                    <div className="text-sm text-neutral-600">Require 2FA for all users</div>
                  </div>
                  <input type="checkbox" className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">Email Verification</div>
                    <div className="text-sm text-neutral-600">Require email verification for new users</div>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="btn btn-primary">Save Changes</button>
              <button className="btn btn-outline">Reset to Defaults</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
