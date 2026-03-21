import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface CollegeSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

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

export default function CollegeSelect({ value, onChange, className }: CollegeSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId: string, subOptionId?: string) => {
        let selectedValue = '';
        if (subOptionId) {
            // Format: "SRMIST - E&T", "SRMIST - FSH", etc.
            selectedValue = `${optionId} - ${subOptionId}`;
        } else {
            // Direct selection: "EEC" or "DENTAL"
            selectedValue = optionId;
        }
        onChange(selectedValue);
        setIsOpen(false);
        setHoveredOption(null);
    };

    // Helper to get display label from value
    const getDisplayLabel = () => {
        if (!value || value === 'all') return 'All Colleges';
        if (value === 'EEC') return 'EEC';
        if (value === 'DENTAL') return 'DENTAL';
        if (value === 'SRM Nightingale School') return 'SRM Nightingale School';
        if (value === 'SRM') return 'SRMIST';
        return value;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left bg-white border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between shadow-sm transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
            >
                <span className={`block truncate ${!value || value === 'all' ? 'text-gray-500' : 'text-gray-900'}`}>
                    {getDisplayLabel()}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-visible focus:outline-none sm:text-sm">
                    {/* All Colleges option */}
                    <div
                        className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 ${
                            value === 'all' ? 'bg-blue-50 font-medium' : ''
                        }`}
                        onClick={() => {
                            onChange('all');
                            setIsOpen(false);
                        }}
                    >
                        <span className="block truncate">All Colleges</span>
                    </div>

                    {COLLEGES.map((college) => (
                        <div
                            key={college.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredOption(college.id)}
                            onMouseLeave={() => setHoveredOption(null)}
                        >
                            <div
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 flex justify-between items-center
                  ${value === college.id ? 'bg-blue-50 font-medium' : ''}`}
                                onClick={() => !college.hasSubmenu && handleSelect(college.label)}
                            >
                                <span className="block truncate">{college.label}</span>
                                {college.hasSubmenu && (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </div>

                            {/* Submenu */}
                            {college.hasSubmenu && hoveredOption === college.id && (
                                <div
                                    className="absolute left-full top-0 w-48 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm -ml-1"
                                >
                                    {college.subOptions?.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 ${
                                                value === `${college.label} - ${sub.label}` ? 'bg-blue-50 font-medium' : ''
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(college.label, sub.label);
                                            }}
                                        >
                                            <span className="block truncate">{sub.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}