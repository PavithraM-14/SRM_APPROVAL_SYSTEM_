'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRequestSchema, UserRole } from '../../../../lib/types';
import { z } from 'zod';
import CostEstimateInput from '../../../../components/CostEstimateInput';
import InstitutionSelect from '../../../../components/InstitutionSelect';
import NestedSelect from '../../../../components/NestedSelect';
import {
  DENTAL_DEPARTMENTS, ENGINEERING_DEPARTMENTS, FSH_DEPARTMENTS,
  EEC_DEPARTMENTS, MANAGEMENT_DEPARTMENTS, SEAD_DEPARTMENTS, NIGHTINGALE_DEPARTMENTS
} from '../../../../lib/constants';

type FormData = z.infer<typeof CreateRequestSchema>;

interface UploadedFile { url: string; filename: string; size: number }

export default function RDCreateRequestPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { register, handleSubmit, setValue, watch, control, formState: { errors }, setError: setFieldError } = useForm<FormData>({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldFocusError: false,
    defaultValues: { attachments: [], costEstimate: undefined, expenseCategory: undefined, college: '', department: '' }
  });

  const costEstimate = watch('costEstimate');
  const college = watch('college');

  let departmentOptions: any[] = ENGINEERING_DEPARTMENTS;
  if (college === 'DENTAL') departmentOptions = DENTAL_DEPARTMENTS;
  else if (college?.includes('FSH')) departmentOptions = FSH_DEPARTMENTS;
  else if (college?.includes('Management')) departmentOptions = MANAGEMENT_DEPARTMENTS;
  else if (college === 'EEC') departmentOptions = EEC_DEPARTMENTS;
  else if (college?.includes('SEAD')) departmentOptions = SEAD_DEPARTMENTS;
  else if (college === 'SRM Nightingale School') departmentOptions = NIGHTINGALE_DEPARTMENTS;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return router.push('/login');
        const user = await res.json();
        if (user.role !== UserRole.RESEARCH_DIRECTOR) return router.push('/dashboard');
      } catch {
        router.push('/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const onSubmit = async (data: FormData) => {
    if (isSubmitting || isUploading) return;
    setError(null);
    let hasErrors = false;

    if (!data.title || data.title.trim().length < 5) { setFieldError('title', { type: 'manual', message: 'Title must be at least 5 characters' }); hasErrors = true; }
    if (!data.purpose || data.purpose.trim().length < 10) { setFieldError('purpose', { type: 'manual', message: 'Purpose must be at least 10 characters' }); hasErrors = true; }
    if (!data.college?.trim()) { setFieldError('college', { type: 'manual', message: 'College is required' }); hasErrors = true; }
    if (!data.department?.trim()) { setFieldError('department', { type: 'manual', message: 'Department is required' }); hasErrors = true; }
    if (uploadedFiles.length === 0) { setFieldError('attachments', { type: 'manual', message: 'At least one document is required' }); hasErrors = true; }

    if (hasErrors) { setError('Please fix all highlighted errors before submitting.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, attachments: uploadedFiles.map(f => f.url) }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to create request');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const result = await response.json();
      router.push(`/dashboard/requests/${result._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length !== files.length) { setError('Only PDF documents are allowed.'); return; }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      validFiles.forEach(file => formData.append('files', file));
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Upload failed'); }
      const uploaded = await res.json();
      const newFiles = uploaded.files.map((p: string) => ({ url: p, filename: p.split('/').pop() || 'unknown', size: 0 }));
      setUploadedFiles(prev => {
        const updated = [...prev, ...newFiles];
        setValue('attachments', updated.map(f => f.url), { shouldValidate: true });
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
      setValue('attachments', updated.map(f => f.url), { shouldValidate: true });
      return updated;
    });
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" /></div>;
  }

  const err = (field: any) => field ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Create New Request</h1>
      <p className="text-gray-500 mb-1 text-sm">This request will be sent directly to the Chairman for approval.</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit, () => { setError('Please fix all highlighted errors before submitting.'); window.scrollTo({ top: 0, behavior: 'smooth' }); })} className="space-y-4 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className={`text-sm font-medium ${errors.title ? 'text-red-600' : 'text-gray-700'}`}>Title<span className="text-red-600">*</span></label>
            <input {...register('title')} placeholder="Enter request title (min 5 characters)" className={`mt-1 w-full border-2 p-3 rounded transition-all focus:outline-none ${err(errors.title)}`} />
            {errors.title && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.title.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={`text-sm font-medium ${errors.purpose ? 'text-red-600' : 'text-gray-700'}`}>Purpose<span className="text-red-600">*</span></label>
            <textarea rows={3} {...register('purpose')} placeholder="Explain the purpose of this request (min 10 characters)" className={`mt-1 w-full border-2 p-3 rounded transition-all focus:outline-none ${err(errors.purpose)}`} />
            {errors.purpose && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.purpose.message}</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${errors.college ? 'text-red-600' : 'text-gray-700'}`}>Institution<span className="text-red-600">*</span></label>
            <Controller control={control} name="college" render={({ field: { value, onChange } }) => (
              <InstitutionSelect value={value} onChange={onChange} error={errors.college?.message} />
            )} />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${errors.department ? 'text-red-600' : 'text-gray-700'}`}>Department<span className="text-red-600">*</span></label>
            <Controller control={control} name="department" render={({ field: { value, onChange } }) => (
              <NestedSelect value={value} onChange={onChange} options={departmentOptions} placeholder="Select Department" error={errors.department?.message} disabled={!college} />
            )} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Cost Estimate</label>
            <CostEstimateInput value={costEstimate || 0} onChange={(v) => setValue('costEstimate', v)} />
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

        <div>
          <div className="flex justify-between items-center">
            <label className={`text-sm font-medium ${errors.attachments ? 'text-red-600' : 'text-gray-700'}`}>
              Document Attachments <span className="text-red-600">*</span>
            </label>
            <input type="file" ref={fileInputRef} accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 text-sm hover:underline font-medium">+ Add Document</button>
          </div>
          {errors.attachments && <p className="text-xs text-red-600 mt-1">{errors.attachments.message}</p>}
          <ul className={`border rounded divide-y mt-2 ${errors.attachments ? 'border-red-600' : 'border-gray-200'}`}>
            {uploadedFiles.map((f, i) => (
              <li key={i} className="flex justify-between p-2 bg-white">
                <span className="truncate text-sm">{f.filename}</span>
                <button type="button" onClick={() => handleRemoveFile(i)} className="text-red-500 text-sm hover:text-red-700">Remove</button>
              </li>
            ))}
            {uploadedFiles.length === 0 && !errors.attachments && <li className="p-4 text-center text-sm text-gray-400 italic">No documents uploaded</li>}
            {uploadedFiles.length === 0 && errors.attachments && <li className="p-4 text-center text-sm text-red-500 italic bg-red-50">Please upload at least one PDF</li>}
          </ul>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">Cancel</button>
          <button type="submit" disabled={isSubmitting || isUploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm">
            {isSubmitting ? 'Creating...' : isUploading ? 'Uploading...' : 'Submit to Chairman'}
          </button>
        </div>
      </form>
    </div>
  );
}
