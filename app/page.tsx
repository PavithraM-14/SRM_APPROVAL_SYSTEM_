'use client';

import Link from 'next/link';
import Image from 'next/image';
import srmLogo from './assets/SRMRMP_LOGO.png';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [backgroundImages] = useState([
    '/images/easwari-engineering-college.jpeg',
    '/images/srm-dental-college.jpeg',
    '/images/srm-university-ramapuram.jpeg',
  ]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Rotate background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Background Images - Carousel Effect */}
      {backgroundImages.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${img}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      ))}

      {/* Content on top of background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1 flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-4 w-full">
            <div className="flex flex-col items-center justify-center text-center py-8">

              {/* SRM Logo at top */}
              <div className="mb-8">
                <Image
                  src={srmLogo}
                  alt="SRM Logo"
                  className="h-40 sm:h-56 w-auto max-w-full drop-shadow-lg"
                  priority
                />
              </div>

              {/* Text below logo */}
              <h1 className="text-4xl sm:text-5xl tracking-tight font-extrabold text-white lg:text-6xl mb-8 lg:mb-16 drop-shadow-lg">
                <span className="block">Digital Institutional</span>
                <span className="block text-blue-300">Approval System</span>
              </h1>

              {/* Login Button below text */}
              <div className="flex justify-center">
                <Link
                  href="/login"
                  className="bg-blue-700 hover:bg-blue-800 text-white text-xl px-10 py-3 rounded-lg shadow-md transition duration-300 transform hover:scale-105"
                >
                  Login
                </Link>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
