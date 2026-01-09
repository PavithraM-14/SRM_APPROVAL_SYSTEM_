import Link from 'next/link';
import Image from 'next/image';
import srmLogo from './assets/SRMRMP_LOGO.png';


export default function HomePage() {
  return (
    <div className="bg-white">
      
      {/* Header */}
<header className="bg-gradient-to-r from-blue-700 to-blue-600 shadow-lg w-full">
  <div className="w-full">
    <div className="flex items-center py-6 pl-6 gap-4">

      {/* SRM Logo */}
      <Image
        src={srmLogo}
        alt="SRM Logo"
        className="h-16 w-auto"
        priority
      />

      {/* Title */}
      <h1 className="text-4xl font-bold text-white tracking-wide drop-shadow-sm">
        SRM-RMP Approval System
      </h1>

    </div>
  </div>
</header>

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden min-h-screen">
        <div className="max-w-7xl mx-auto h-full">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32 h-full pt-2">
            <main className="mt-4 mx-auto max-w-4xl px-4 sm:mt-6 h-full">
              <div className="flex flex-col items-center justify-center h-full min-h-[70vh] text-center">

                {/* SRM Logo at top */}
                <div className="mb-8">
                  <Image
                    src={srmLogo}
                    alt="SRM Logo"
                    className="h-60 sm:h-80 w-auto max-w-full"
                    priority
                  />
                </div>

                {/* Text below logo */}
                <h1 className="text-4xl sm:text-5xl tracking-tight font-extrabold text-gray-900 lg:text-6xl mb-8 lg:mb-16">
                  <span className="block">Digital Institutional</span>
                  <span className="block text-blue-700">Approval System</span>
                </h1>

                {/* Login Button below text */}
                <div className="flex justify-center">
                  <Link
                    href="/login"
                    className="bg-blue-700 hover:bg-blue-800 text-white text-lg px-10 py-3 rounded-lg shadow-md transition"
                  >
                    Login
                  </Link>
                </div>

              </div>
            </main>
          </div>
        </div>
      </div>

    </div>
  );
}
