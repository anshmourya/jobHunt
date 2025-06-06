import React from 'react';
import Link from 'next/link';

const Logo = () => {
  return (
    <Link href="/" className="flex items-center space-x-2">
      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
        J
      </div>
      <span className="text-xl font-bold text-gray-800">JobHunt</span>
    </Link>
  );
};

export default Logo;
