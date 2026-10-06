import React from 'react';
import { Compass, CloudSun, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 py-12 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="text-base font-bold font-display text-slate-900 flex items-center gap-1.5">
              <span>Kaki Trails</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            </div>
            <p className="text-slate-500 leading-relaxed">
              Designed for travelers seeking authentic Singapore heritage, secret greenery, and reliable tropical weather planning.
            </p>
          </div>

          {/* APIs Designed For (Course Project Context) */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              Weather Sensors (Data.gov.sg)
            </div>
            <ul className="space-y-1.5 text-slate-500">
              <li>two-hr-forecast & 24h outlook</li>
              <li>four-day-outlook synoptic</li>
              <li>air-temperature & rainfall</li>
              <li>uv, relative-humidity & wind-speed</li>
              <li>psi & pm25 national air quality</li>
            </ul>
          </div>

          {/* Spatial Mapping */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              Spatial & Routing (OneMap SG)
            </div>
            <ul className="space-y-1.5 text-slate-500">
              <li>Elastic geocode search</li>
              <li>Reverse geocoding (lat/lng)</li>
              <li>Walking, cycle & transit routing</li>
              <li>Sheltered linkway calculation</li>
            </ul>
          </div>

          {/* Project & Tourist Tips */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              Singapore Tourist Tips
            </div>
            <p className="text-slate-500 leading-relaxed">
              Tropical showers in Singapore typically peak between 14:30 and 16:30. Always pack an umbrella and check our shelter indicators before embarking!
            </p>
          </div>

        </div>

        {/* Bottom Copyright Strip */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
          <div>
            © {new Date().getFullYear()} Kaki Trails Singapore. Academic Course Project Frontend Prototype.
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Data: Singapore Government Open Data & OneMap</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
