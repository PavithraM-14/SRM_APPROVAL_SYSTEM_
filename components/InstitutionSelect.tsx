import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface InstitutionSelectProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    className?: string;
}

const INSTITUTIONS = [
    {
        id: 'SRM',
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

export default function InstitutionSelect({ value, onChange, error, className }: InstitutionSelectProps) {
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
        if (!value) return 'Select Institution';
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
                className={`w-full text-left bg-white border rounded-lg px-4 py-3 flex items-center justify-between shadow-sm transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 hover:border-gray-400 focus:ring-blue-500 focus:border-blue-500'}
          focus:outline-none focus:ring-2`}
            >
                <span className={`block truncate ${!value ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                    {getDisplayLabel()}
                </span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-visible focus:outline-none sm:text-sm">
                    {INSTITUTIONS.map((inst) => (
                        <div
                            key={inst.id}
                            className="relative group"
                            onMouseEnter={() => setHoveredOption(inst.id)}
                            onMouseLeave={() => setHoveredOption(null)}
                        >
                            <div
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 flex justify-between items-center
                  ${value === inst.id ? 'bg-blue-50 font-medium' : ''}`}
                                onClick={() => !inst.hasSubmenu && handleSelect(inst.label)}
                            >
                                <span className="block truncate">{inst.label}</span>
                                {inst.hasSubmenu && (
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                )}
                            </div>

                            {/* Submenu */}
                            {inst.hasSubmenu && hoveredOption === inst.id && (
                                <div
                                    className="absolute left-full top-0 w-48 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm -ml-1"
                                >
                                    {inst.subOptions?.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Format: "SRMIST - E&T"
                                                handleSelect(inst.label, sub.label);
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
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}
