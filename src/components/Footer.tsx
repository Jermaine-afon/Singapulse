import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-canvas-soft py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-5 space-y-4">
            <div className="display text-3xl text-canvas flex items-center gap-2">
              <span>Singapulse</span>
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" aria-hidden="true" />
            </div>
            <p className="text-base leading-relaxed max-w-sm">
              A calm planner for visiting Singapore: find lesser-known places, check the weather and plan a day that
              works rain or shine.
            </p>
          </div>

          {/* Data credits */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-2">
              <h2 className="font-semibold text-sm text-canvas">Weather</h2>
              <p className="leading-relaxed">NEA via Data.gov.sg</p>
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold text-sm text-canvas">Maps &amp; search</h2>
              <p className="leading-relaxed">OneMap / Singapore Land Authority</p>
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold text-sm text-canvas">AI planning</h2>
              <p className="leading-relaxed">DeepSeek</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-canvas-soft/20 text-sm">
          © {new Date().getFullYear()} Singapulse. Academic course project prototype.
        </div>
      </div>
    </footer>
  );
};
