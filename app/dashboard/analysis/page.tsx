'use client';

import { useEffect, useState } from 'react';
import { 
  DocumentTextIcon,
  FolderIcon,
  FolderOpenIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { DENTAL_DEPARTMENTS, ENGINEERING_DEPARTMENTS, FSH_DEPARTMENTS, EEC_DEPARTMENTS, MANAGEMENT_DEPARTMENTS, SEAD_DEPARTMENTS, NIGHTINGALE_DEPARTMENTS } from '../../../lib/constants';
import CollegeSelect from '../../../components/CollegeSelect';

interface RequestData {
  _id: string;
  requestId: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  expenseCategory: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    name: string;
    email: string;
    department: string;
  };
}

interface HierarchicalData {
  [campus: string]: {
    [college: string]: {
      [department: string]: RequestData[];
    };
  };
}

// College structure from signup page
const COLLEGES = [
  {
    id: 'SRMIST',
    label: 'SRMIST',
    hasSubmenu: true,
    subOptions: [
      { id: 'E&T', label: 'E&T' },
      { id: 'FSH', label: 'FSH' },
      { id: 'Management', label: 'Management' },
      { id: 'SEAD', label: 'SEAD' }
    ]
  },
  { id: 'EEC', label: 'EEC' },
  { id: 'DENTAL', label: 'DENTAL' },
  { id: 'SRM Nightingale School', label: 'SRM Nightingale School' }
];

// Department mapping from signup page
const getDepartmentsByCollege = (college: string) => {
  if (college === 'DENTAL') return DENTAL_DEPARTMENTS;
  if (college === 'EEC') return EEC_DEPARTMENTS;
  if (college?.includes('FSH')) return FSH_DEPARTMENTS;
  if (college?.includes('Management')) return MANAGEMENT_DEPARTMENTS;
  if (college?.includes('SEAD')) return SEAD_DEPARTMENTS;
  if (college === 'SRM Nightingale School') return NIGHTINGALE_DEPARTMENTS;
  if (college?.includes('E&T')) return ENGINEERING_DEPARTMENTS;
  return ENGINEERING_DEPARTMENTS;
};

export default function AnalysisPage() {
  const [allRequests, setAllRequests] = useState<RequestData[]>([]);
  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Request view states
  const [expandedCampus, setExpandedCampus] = useState<string | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [expandedSRMIST, setExpandedSRMIST] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests?all=true', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      setAllRequests(data.requests || []);
      organizeHierarchicalData(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const organizeHierarchicalData = (requests: RequestData[]) => {
    const organized: HierarchicalData = {};
    
    requests.forEach(request => {
      const campus = 'Ramapuram';
      const college = request.college || 'Unknown College';
      const department = request.department || 'Unknown Department';
      
      if (!organized[campus]) {
        organized[campus] = {};
      }
      if (!organized[campus][college]) {
        organized[campus][college] = {};
      }
      if (!organized[campus][college][department]) {
        organized[campus][college][department] = [];
      }
      
      organized[campus][college][department].push(request);
    });
    
    setHierarchicalData(organized);
  };

  const getCollegeRequests = (college: string) => {
    return allRequests.filter(request => request.college === college);
  };

  const getDepartmentRequests = (college: string, department: string) => {
    return allRequests.filter(request => 
      request.college === college && request.department === department
    );
  };

  const getFilteredCollegeRequests = (college: string) => {
    const collegeRequests = getCollegeRequests(college);
    return collegeRequests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestId.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || request.department === departmentFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const requestDate = new Date(request.createdAt);
        const now = new Date();
        const daysDiff = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (dateFilter) {
          case '7':
            matchesDate = daysDiff <= 7;
            break;
          case '30':
            matchesDate = daysDiff <= 30;
            break;
          case '90':
            matchesDate = daysDiff <= 90;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDepartment && matchesDate;
    });
  };

  const getFilteredDepartmentRequests = (college: string, department: string) => {
    const departmentRequests = getDepartmentRequests(college, department);
    return departmentRequests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestId.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const requestDate = new Date(request.createdAt);
        const now = new Date();
        const daysDiff = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (dateFilter) {
          case '7':
            matchesDate = daysDiff <= 7;
            break;
          case '30':
            matchesDate = daysDiff <= 30;
            break;
          case '90':
            matchesDate = daysDiff <= 90;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFilteredRequests = () => {
    return allRequests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requestId.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesCollege = collegeFilter === 'all' || request.college === collegeFilter;
      const matchesDepartment = departmentFilter === 'all' || request.department === departmentFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const requestDate = new Date(request.createdAt);
        const now = new Date();
        const daysDiff = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (dateFilter) {
          case '7':
            matchesDate = daysDiff <= 7;
            break;
          case '30':
            matchesDate = daysDiff <= 30;
            break;
          case '90':
            matchesDate = daysDiff <= 90;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesCollege && matchesDepartment && matchesDate;
    });
  };

  const getUniqueValues = (field: keyof RequestData) => {
    const values = [...new Set(allRequests.map(req => req[field] as string))];
    return values.filter(Boolean).sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Requests</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchAllRequests}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
          <p className="text-gray-600">
            {selectedDepartment && selectedCollege
              ? `Viewing requests for ${selectedDepartment} Department in ${selectedCollege} College`
              : selectedCollege 
                ? `Viewing requests for ${selectedCollege} College`
                : 'Comprehensive view of all requests in the system'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {(selectedCollege || selectedDepartment) && (
            <button
              onClick={() => {
                if (selectedDepartment) {
                  setSelectedDepartment(null);
                } else {
                  setSelectedCollege(null);
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to {selectedDepartment ? 'College' : 'All Colleges'}
            </button>
          )}
          <div className="text-sm text-gray-500">
            Total: {
              selectedDepartment && selectedCollege
                ? getDepartmentRequests(selectedCollege, selectedDepartment).length
                : selectedCollege 
                  ? getCollegeRequests(selectedCollege).length 
                  : allRequests.length
            } requests
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters & Search
          </h3>
          <span className="text-sm text-gray-500">
            {selectedDepartment && selectedCollege
              ? `${getFilteredDepartmentRequests(selectedCollege, selectedDepartment).length} of ${getDepartmentRequests(selectedCollege, selectedDepartment).length} requests`
              : selectedCollege 
                ? `${getFilteredCollegeRequests(selectedCollege).length} of ${getCollegeRequests(selectedCollege).length} requests`
                : `${filteredRequests.length} of ${allRequests.length} requests`
            }
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="xl:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {getUniqueValues('status').map(status => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
          </div>

          {/* College Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
            <CollegeSelect
              value={collegeFilter}
              onChange={(value) => {
                setCollegeFilter(value);
                setDepartmentFilter('all'); // Reset department when college changes
                // Also update the selected college for the main view
                if (value === 'all') {
                  setSelectedCollege(null);
                } else {
                  setSelectedCollege(value);
                }
                setSelectedDepartment(null);
              }}
            />
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                // Also update the selected department for the main view
                if (e.target.value === 'all') {
                  setSelectedDepartment(null);
                } else {
                  setSelectedDepartment(e.target.value);
                }
              }}
              disabled={collegeFilter === 'all'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="all">All Departments</option>
              {collegeFilter !== 'all' && getDepartmentsByCollege(collegeFilter).map((dept) => {
                if (typeof dept === 'string') {
                  return (
                    <option key={dept} value={dept}>{dept}</option>
                  );
                } else if (dept && typeof dept === 'object' && 'label' in dept) {
                  // Handle nested departments (like CSE specializations)
                  return (
                    <optgroup key={dept.label} label={dept.label}>
                      {dept.subOptions?.map((subDept: any) => (
                        <option key={subDept.value} value={subDept.value}>
                          {subDept.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                }
                return null;
              })}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hierarchical View */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FolderIcon className="h-5 w-5 mr-2" />
            Campus & Colleges
          </h3>
          <p className="text-sm text-gray-600 mt-1">Browse requests organized by campus, college, and department</p>
        </div>
        
        <div className="p-6">
          {/* Campus Level - Ramapuram */}
          <div className="mb-4">
            <button
              onClick={() => setExpandedCampus(expandedCampus === 'Ramapuram' ? null : 'Ramapuram')}
              className="flex items-center w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {expandedCampus === 'Ramapuram' ? (
                <FolderOpenIcon className="h-5 w-5 text-blue-600 mr-2" />
              ) : (
                <FolderIcon className="h-5 w-5 text-gray-600 mr-2" />
              )}
              <span className="font-medium text-gray-900">Ramapuram</span>
              <span className="ml-2 text-sm text-gray-500">
                ({allRequests.length} requests)
              </span>
            </button>

            {/* Colleges Level */}
            {expandedCampus === 'Ramapuram' && (
              <div className="ml-6 mt-2 space-y-2">
                {COLLEGES.map((college) => {
                  if (college.hasSubmenu) {
                    // SRMIST with submenu
                    return (
                      <div key={college.id}>
                        <button
                          onClick={() => setExpandedSRMIST(!expandedSRMIST)}
                          className="flex items-center justify-between w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            {expandedSRMIST ? (
                              <FolderOpenIcon className="h-4 w-4 text-blue-600 mr-2" />
                            ) : (
                              <FolderIcon className="h-4 w-4 text-gray-600 mr-2" />
                            )}
                            <span className="font-medium text-gray-800">{college.label}</span>
                          </div>
                          <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${expandedSRMIST ? 'rotate-90' : ''}`} />
                        </button>

                        {/* SRMIST Sub-colleges */}
                        {expandedSRMIST && (
                          <div className="ml-6 mt-2 space-y-2">
                            {college.subOptions?.map((subCollege) => {
                              const fullCollegeName = `${college.label} - ${subCollege.label}`;
                              const collegeRequestCount = getCollegeRequests(fullCollegeName).length;
                              const isSelected = selectedCollege === fullCollegeName;
                              
                              return (
                                <div key={subCollege.id}>
                                  <button
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedCollege(null);
                                        setSelectedDepartment(null);
                                      } else {
                                        setSelectedCollege(fullCollegeName);
                                        setSelectedDepartment(null);
                                      }
                                    }}
                                    className={`flex items-center justify-between w-full text-left p-3 rounded-lg transition-colors ${
                                      isSelected 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      <FolderIcon className={`h-4 w-4 mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                                      <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                        {subCollege.label}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-500">
                                        {collegeRequestCount} requests
                                      </span>
                                      {isSelected && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          Selected
                                        </span>
                                      )}
                                    </div>
                                  </button>

                                  {/* Departments for selected college */}
                                  {isSelected && (
                                    <div className="ml-6 mt-2 space-y-1">
                                      <div className="text-xs font-medium text-gray-500 mb-2">Departments:</div>
                                      {getDepartmentsByCollege(fullCollegeName).map((dept) => {
                                        if (typeof dept === 'string') {
                                          const deptRequestCount = getDepartmentRequests(fullCollegeName, dept).length;
                                          const isDeptSelected = selectedDepartment === dept;
                                          
                                          return (
                                            <button
                                              key={dept}
                                              onClick={() => setSelectedDepartment(isDeptSelected ? null : dept)}
                                              className={`flex items-center justify-between w-full text-left p-2 rounded-lg transition-colors ${
                                                isDeptSelected 
                                                  ? 'bg-green-50 border border-green-200' 
                                                  : 'hover:bg-gray-50'
                                              }`}
                                            >
                                              <span className={`text-sm ${isDeptSelected ? 'text-green-900 font-medium' : 'text-gray-600'}`}>
                                                {dept}
                                              </span>
                                              <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">
                                                  {deptRequestCount}
                                                </span>
                                                {isDeptSelected && (
                                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                    Selected
                                                  </span>
                                                )}
                                              </div>
                                            </button>
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Direct colleges (EEC, DENTAL, etc.)
                    const collegeRequestCount = getCollegeRequests(college.label).length;
                    const isSelected = selectedCollege === college.label;
                    
                    return (
                      <div key={college.id}>
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCollege(null);
                              setSelectedDepartment(null);
                            } else {
                              setSelectedCollege(college.label);
                              setSelectedDepartment(null);
                            }
                          }}
                          className={`flex items-center justify-between w-full text-left p-3 rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center">
                            <FolderIcon className={`h-4 w-4 mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                            <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                              {college.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {collegeRequestCount} requests
                            </span>
                            {isSelected && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Departments for selected college */}
                        {isSelected && (
                          <div className="ml-6 mt-2 space-y-1">
                            <div className="text-xs font-medium text-gray-500 mb-2">Departments:</div>
                            {getDepartmentsByCollege(college.label).map((dept) => {
                              if (typeof dept === 'string') {
                                const deptRequestCount = getDepartmentRequests(college.label, dept).length;
                                const isDeptSelected = selectedDepartment === dept;
                                
                                return (
                                  <button
                                    key={dept}
                                    onClick={() => setSelectedDepartment(isDeptSelected ? null : dept)}
                                    className={`flex items-center justify-between w-full text-left p-2 rounded-lg transition-colors ${
                                      isDeptSelected 
                                        ? 'bg-green-50 border border-green-200' 
                                        : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <span className={`text-sm ${isDeptSelected ? 'text-green-900 font-medium' : 'text-gray-600'}`}>
                                      {dept}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">
                                        {deptRequestCount}
                                      </span>
                                      {isDeptSelected && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                          Selected
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedDepartment && selectedCollege
              ? `${selectedDepartment} Department - ${selectedCollege} College Requests`
              : selectedCollege 
                ? `${selectedCollege} College Requests` 
                : 'All Requests'
            }
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {selectedDepartment && selectedCollege
              ? `Complete list of requests from ${selectedDepartment} Department in ${selectedCollege} College with filtering applied`
              : selectedCollege 
                ? `Complete list of requests from ${selectedCollege} College with filtering applied`
                : 'Complete list of all requests with filtering applied'
            }
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {selectedDepartment 
                    ? 'College' 
                    : selectedCollege 
                      ? 'Department' 
                      : 'College/Department'
                  }
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(selectedDepartment && selectedCollege
                ? getFilteredDepartmentRequests(selectedCollege, selectedDepartment)
                : selectedCollege 
                  ? getFilteredCollegeRequests(selectedCollege) 
                  : filteredRequests
              ).map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{request.title}</div>
                      <div className="text-sm text-gray-500">#{request.requestId}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.requester.name}</div>
                    <div className="text-sm text-gray-500">{request.requester.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {selectedDepartment ? (
                      <div className="text-sm text-gray-900">{request.college}</div>
                    ) : selectedCollege ? (
                      <div className="text-sm text-gray-900">{request.department}</div>
                    ) : (
                      <div>
                        <div className="text-sm text-gray-900">{request.college}</div>
                        <div className="text-sm text-gray-500">{request.department}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{request.costEstimate.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/dashboard/requests/${request._id}`}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {(selectedDepartment && selectedCollege
            ? getFilteredDepartmentRequests(selectedCollege, selectedDepartment)
            : selectedCollege 
              ? getFilteredCollegeRequests(selectedCollege) 
              : filteredRequests
          ).length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
              <p className="text-gray-500">
                {selectedDepartment && selectedCollege
                  ? `No requests found for ${selectedDepartment} Department in ${selectedCollege} College matching your current filter criteria.`
                  : selectedCollege 
                    ? `No requests found for ${selectedCollege} College matching your current filter criteria.`
                    : 'No requests match your current filter criteria.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}