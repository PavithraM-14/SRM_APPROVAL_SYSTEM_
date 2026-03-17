'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRequestSchema, UserRole } from '../../../../lib/types';
import { AuthUser } from '../../../../lib/auth';
import { z } from 'zod';
import CostEstimateInput from '../../../../components/CostEstimateInput';
import InstitutionSelect from '../../../../components/InstitutionSelect';
import NestedSelect from '../../../../components/NestedSelect';
import { Controller } from 'react-hook-form';
import { DENTAL_DEPARTMENTS, ENGINEERING_DEPARTMENTS, FSH_DEPARTMENTS, EEC_DEPARTMENTS, MANAGEMENT_DEPARTMENTS, SEAD_DEPARTMENTS, NIGHTINGALE_DEPARTMENTS } from '../../../../lib/constants';

type CreateRequestFormData = z.infer<typeof CreateRequestSchema>;

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
}

const removeNumberArrows = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`;

export default function CreateRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    trigger,
    getValues,
    setError: setFieldError
  } = useForm<CreateRequestFormData>({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldFocusError: false,
    defaultValues: {
      attachments: [],
      costEstimate: undefined,
      expenseCategory: undefined,
      college: '',
      department: '',
    }
  });

  const costEstimate = watch('costEstimate');
  const college = watch('college');

  // Use any because the constants have different structures (strings vs objects)
  // NestedSelect handles normalization internally
  let departmentOptions: any[] = ENGINEERING_DEPARTMENTS;
  if (college === 'DENTAL') {
    departmentOptions = DENTAL_DEPARTMENTS;
  } else if (college?.includes('FSH')) {
    departmentOptions = FSH_DEPARTMENTS;
  } else if (college?.includes('Management')) {
    departmentOptions = MANAGEMENT_DEPARTMENTS;
  } else if (college === 'EEC') {
    departmentOptions = EEC_DEPARTMENTS;
  } else if (college?.includes('SEAD')) {
    departmentOptions = SEAD_DEPARTMENTS;
  } else if (college === 'SRM Nightingale School') {
    departmentOptions = NIGHTINGALE_DEPARTMENTS;
  } else if (college?.includes('E&T')) {
    departmentOptions = ENGINEERING_DEPARTMENTS;
  }

  const errorText = 'text-xs text-red-600 mt-1';

  /* AUTH CHECK */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return router.push('/login');

        const userData = await res.json();
        if (userData.role !== UserRole.REQUESTER) {
          router.push('/dashboard');
          return;
        }
        setUser(userData);
      } catch {
        router.push('/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  /* DEBUG: Log errors when they change */
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form errors updated:', errors);
    }
  }, [errors]);

  /* SUBMIT */
  const onSubmit = async (data: CreateRequestFormData) => {
    if (isSubmitting || isUploading) {
      console.log('[DEBUG] Submission blocked: already processing');
      return;
    }

    console.log('[DEBUG] Form submission attempt:', { data, uploadedFiles: uploadedFiles.length });
    
    setError(null);
    let hasErrors = false;

    // Manual validation - check each field
    if (!data.title || data.title.trim().length < 5) {
      console.log('[DEBUG] Title validation failed');
      setFieldError('title', { type: 'manual', message: 'Title must be at least 5 characters' });
      hasErrors = true;
    }

    if (!data.purpose || data.purpose.trim().length < 10) {
      console.log('[DEBUG] Purpose validation failed');
      setFieldError('purpose', { type: 'manual', message: 'Purpose must be at least 10 characters' });
      hasErrors = true;
    }

    if (!data.college || !data.college.trim()) {
      console.log('[DEBUG] College validation failed');
      setFieldError('college', { type: 'manual', message: 'College is required' });
      hasErrors = true;
    }

    if (!data.department || !data.department.trim()) {
      console.log('[DEBUG] Department validation failed');
      setFieldError('department', { type: 'manual', message: 'Department is required' });
      hasErrors = true;
    }

    if (uploadedFiles.length === 0) {
      console.log('[DEBUG] Attachments validation failed');
      setFieldError('attachments', { type: 'manual', message: 'At least one document is required' });
      hasErrors = true;
    }

    if (hasErrors) {
      console.log('[DEBUG] Validation failed, showing errors');
      setError('Please fix all highlighted errors before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    console.log('[DEBUG] All validations passed, proceeding with API call');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          attachments: uploadedFiles.map(f => f.url),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('[DEBUG] API error response:', err);
        
        // Handle Zod validation errors from the server
        if (err.errors && Array.isArray(err.errors)) {
          const errorMessages = err.errors.map((e: any) => e.message).join(', ');
          setError(`Validation error: ${errorMessages}`);
        } else {
          setError(err.error || 'Failed to create request');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const result = await response.json();
      console.log('[DEBUG] Request created successfully:', result._id);
      router.push(`/dashboard/requests/${result._id}`);
    } catch (err) {
      console.error('[DEBUG] Submission error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (fieldErrors: any) => {
    console.log('[DEBUG] React-hook-form validation errors:', fieldErrors);
    setError('Please fix all highlighted errors before submitting.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* FILE UPLOAD */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      setError('Only PDF documents are allowed.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add all files to the form data (fixed to use 'files' parameter)
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploaded = await res.json();

      // Convert the uploaded files to the expected format
      const newFiles = uploaded.files.map((filePath: string) => ({
        url: filePath,
        filename: filePath.split('/').pop() || 'unknown',
        size: 0 // We don't have size info from the API response
      }));

      setUploadedFiles(prev => {
        const updated = [...prev, ...newFiles];

        // ✅ CRITICAL: sync with react-hook-form
        setValue(
          'attachments',
          updated.map(f => f.url),
          { shouldValidate: true }
        );

        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (i: number) => {
    setUploadedFiles(prev => {
      const updated = prev.filter((_, idx) => idx !== i);

      setValue(
        'attachments',
        updated.map(f => f.url),
        { shouldValidate: true }
      );

      return updated;
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <style>{removeNumberArrows}</style>

      <h1 className="text-2xl font-bold">Create New Request</h1>
      <p className="text-gray-600 mb-4">Fill in the details for your new request</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className={`text-sm font-medium ${errors.title ? 'text-red-600' : 'text-gray-700'}`}>Title<span className="text-red-600">*</span></label>
            <input
              {...register('title')}
              placeholder="Enter request title (min 5 characters)"
              onBlur={(e) => {
                if (e.target.value.trim().length > 0 && e.target.value.trim().length < 5) {
                  setFieldError('title', { type: 'manual', message: 'Title must be at least 5 characters' });
                }
              }}
              className={`mt-1 w-full border-2 p-3 rounded transition-all focus:outline-none ${
                errors.title
                  ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {errors.title && <p className={`${errorText} font-semibold`}>{errors.title.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={`text-sm font-medium ${errors.purpose ? 'text-red-600' : 'text-gray-700'}`}>Purpose<span className="text-red-600">*</span></label>
            <textarea
              rows={3}
              {...register('purpose')}
              placeholder="Explain the purpose of this request (min 10 characters)"
              onBlur={(e) => {
                if (e.target.value.trim().length > 0 && e.target.value.trim().length < 10) {
                  setFieldError('purpose', { type: 'manual', message: 'Purpose must be at least 10 characters' });
                }
              }}
              className={`mt-1 w-full border-2 p-3 rounded transition-all focus:outline-none ${
                errors.purpose
                  ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200'
                  : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            {errors.purpose && <p className={`${errorText} font-semibold`}>{errors.purpose.message}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${errors.college ? 'text-red-600' : 'text-gray-700'}`}>Institution<span className="text-red-600">*</span></label>
            <Controller
              control={control}
              name="college"
              render={({ field: { value, onChange } }) => (
                <InstitutionSelect
                  value={value}
                  onChange={(newValue) => {
                    onChange(newValue);
                    // Validate college field after selection
                    trigger('college');
                  }}
                  error={errors.college?.message}
                />
              )}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${errors.department ? 'text-red-600' : 'text-gray-700'}`}>Department<span className="text-red-600">*</span></label>
            <Controller
              control={control}
              name="department"
              render={({ field: { value, onChange } }) => (
                <NestedSelect
                  value={value}
                  onChange={(newValue) => {
                    onChange(newValue);
                    // Validate department field after selection
                    trigger('department');
                  }}
                  options={departmentOptions}
                  placeholder="Select Department"
                  error={errors.department?.message}
                  disabled={!college}
                />
              )}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Cost Estimate</label>
            <CostEstimateInput
              value={costEstimate || 0}
              onChange={(v) => setValue('costEstimate', v)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Expense Category</label>
            <input {...register('expenseCategory')} className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-blue-500" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">SOP Reference</label>
            <input {...register('sopReference')} className="mt-1 w-full border border-gray-300 p-2 rounded focus:ring-blue-500" />
          </div>
        </div>

        {/* DOCUMENTS */}
        <div>
          <div className="flex justify-between items-center">
            <label className={`text-sm font-medium ${errors.attachments ? 'text-red-600' : 'text-gray-700'}`}>
              Document Attachments <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 text-sm hover:underline font-medium"
            >
              + Add Document
            </button>
          </div>

          {errors.attachments && (
            <p className="text-xs text-red-600 mt-1">
              {errors.attachments.message}
            </p>
          )}

          <ul className={`border rounded divide-y mt-2 ${errors.attachments ? 'border-red-600' : 'border-gray-200'}`}>
            {uploadedFiles.map((f, i) => (
              <li key={i} className="flex justify-between p-2 bg-white">
                <span className="truncate text-sm">{f.filename}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(i)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
            {uploadedFiles.length === 0 && !errors.attachments && (
              <li className="p-4 text-center text-sm text-gray-400 italic">No documents uploaded</li>
            )}
            {uploadedFiles.length === 0 && errors.attachments && (
              <li className="p-4 text-center text-sm text-red-500 italic bg-red-50">Please upload at least one PDF</li>
            )}
          </ul>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm"
          >
            {isSubmitting ? 'Creating...' : isUploading ? 'Uploading...' : 'Create Request'}
          </button>
        </div>

      </form>
    </div>
  );
}
