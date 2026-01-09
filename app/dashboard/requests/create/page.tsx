'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRequestSchema, UserRole } from '../../../../lib/types';
import { AuthUser } from '../../../../lib/auth';
import { z } from 'zod';
import CostEstimateInput from '../../../../components/CostEstimateInput';

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
    formState: { errors }
  } = useForm<CreateRequestFormData>({
    resolver: zodResolver(CreateRequestSchema),
    defaultValues: {
      attachments: [],
      costEstimate: undefined,     // NOT mandatory
      expenseCategory: undefined,  // NOT mandatory
    }
  });

  const costEstimate = watch('costEstimate');
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

  /* SUBMIT */
  const onSubmit = async (data: CreateRequestFormData) => {
    setError(null);

    // ✅ SAFETY CHECK (in case user bypasses UI)
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one PDF document.');
      return;
    }

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
        throw new Error(err.error || 'Failed to create request');
      }

      const result = await response.json();
      router.push(`/dashboard/requests/${result._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Title*</label>
            <input {...register('title')} className="mt-1 w-full border p-2 rounded" />
            {errors.title && <p className={errorText}>{errors.title.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Purpose*</label>
            <textarea rows={3} {...register('purpose')} className="mt-1 w-full border p-2 rounded" />
            {errors.purpose && <p className={errorText}>{errors.purpose.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Institution* </label>
            <select {...register('college')} className="mt-1 w-full border p-2 rounded">
              <option value="">Select Institution </option>
              <option value="SRM">SRM</option>
              <option value="EEC">EEC</option>
              <option value="DENTAL">DENTAL</option>
            </select>
            {errors.college && <p className={errorText}>{errors.college.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Department* </label>
            <select {...register('department')} className="mt-1 w-full border p-2 rounded" >
            <option value="">Select Department </option>
            <option value="SRM">CSE</option>
              <option value="EEC">ECE</option>
              <option value="DENTAL">EEE</option>
            </select>
            {errors.department && <p className={errorText}>{errors.department.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Cost Estimate</label>
            <CostEstimateInput
              value={costEstimate || 0}
              onChange={(v) => setValue('costEstimate', v)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Expense Category</label>
            <input {...register('expenseCategory')} className="mt-1 w-full border p-2 rounded" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">SOP Reference (Optional)</label>
            <input {...register('sopReference')} className="mt-1 w-full border p-2 rounded" />
          </div>
        </div>

        {/* DOCUMENTS */}
        <div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">
              Document Attachments (PDF Only) *
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
              className="text-blue-600 text-sm"
            >
              + Add Document
            </button>
          </div>

          {errors.attachments && (
            <p className="text-xs text-red-600 mt-1">
              {errors.attachments.message}
            </p>
          )}

          <ul className="border rounded divide-y mt-2">
            {uploadedFiles.map((f, i) => (
              <li key={i} className="flex justify-between p-2">
                <span className="truncate">{f.filename}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(i)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Request'}
          </button>
        </div>

      </form>
    </div>
  );
}
