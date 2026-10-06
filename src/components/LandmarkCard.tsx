import React from 'react';
import { Landmark } from '../types';
import { Clock, Bookmark, BookmarkCheck, Umbrella, Sun, Navigation, ArrowRight } from 'lucide-react';
import { LandmarkPhoto, PhotoCredit } from './LandmarkPhoto';

interface LandmarkCardProps {
  landmark: Landmark;
  isSaved: boolean;
  onToggleSave: (landmarkId: string) => void;
  onSelectForDetails: (landmark: Landmark) => void;
  onCheckWeather: (landmark: Landmark) => void;
  onGetDirections: (landmark: Landmark) => void;
}

// Some STB text fields carry raw <sup> tags; show plain text only.
const stripSup = (text: string) => text.replace(/<\/?sup>/gi, '');

const CATEGORY_COLOURS: Record<Landmark['category'], string> = {
  architecture: '#0e0f0c',
  heritage: '#b86700',
  greenery: '#2ead4b',
  eats_culture: '#d03238',
  coastal: '#0b7fae',
};

export const LandmarkCard: React.FC<LandmarkCardProps> = ({
  landmark,
  isSaved,
  onToggleSave,
  onSelectForDetails,
  onCheckWeather,
  onGetDirections,
}) => {

  // Category label formatter
  const getCategoryLabel = (cat: Landmark['category']) => {
    switch (cat) {
      case 'architecture':
        return 'Architecture';
      case 'heritage':
        return 'Heritage';
      case 'greenery':
        return 'Greenery';
      case 'eats_culture':
        return 'Alleys & food';
      case 'coastal':
        return 'Coastal';
      default:
        return 'Landmark';
    }
  };

  const shelter =
    landmark.shelterLevel === 'full_shelter'
      ? { label: 'Rain-safe', className: 'badge-positive' }
      : landmark.shelterLevel === 'partial_shelter'
        ? { label: 'Partly covered', className: 'badge-neutral' }
        : { label: 'Open air', className: 'badge-neutral' };

  return (
    <article className="bg-canvas rounded-3xl overflow-hidden p-2 flex flex-col group">
      {/* Photo (mouse shortcut to details; the title button is the accessible control) */}
      <div
        className="relative aspect-4/3 overflow-hidden rounded-2xl bg-canvas-soft cursor-pointer"
        onClick={() => onSelectForDetails(landmark)}
      >
        <LandmarkPhoto
          landmark={landmark}
          lazy
          size="card"
          className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(landmark.id);
          }}
          aria-label={isSaved ? `Remove ${landmark.name} from My Trail` : `Save ${landmark.name} to My Trail`}
          aria-pressed={isSaved}
          className={`btn btn-icon absolute top-3 right-3 ${isSaved ? 'btn-primary' : 'bg-canvas text-ink hover:bg-canvas-soft'}`}
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Bookmark className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>
      <PhotoCredit landmark={landmark} className="px-2 pt-1.5" />

      {/* Content */}
      <div className="px-4 pt-4 pb-3 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink leading-snug">
            <button
              type="button"
              onClick={() => onSelectForDetails(landmark)}
              className="text-left cursor-pointer hover:underline decoration-2 underline-offset-4"
            >
              {stripSup(landmark.name)}
            </button>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-body">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLOURS[landmark.category] ?? '#0e0f0c' }}
              aria-hidden="true"
            />
            <span>{getCategoryLabel(landmark.category)}</span>
            <span aria-hidden="true" className="text-mute">·</span>
            <span>{landmark.neighborhood}</span>
          </p>
        </div>

        <p className="text-sm text-body leading-relaxed line-clamp-2">{stripSup(landmark.description)}</p>

        {/* Facts */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-body">
          <span className="inline-flex items-center gap-1.5 nums">
            <Clock className="w-4 h-4 text-mute" strokeWidth={1.75} aria-hidden="true" />
            {landmark.recommendedDuration}
          </span>
          <span>{landmark.admission === 'Free' ? 'Free entry' : 'Paid entry'}</span>
          {landmark.isStbAttraction && <span className="badge badge-sm badge-neutral">Official attraction</span>}
          <span className={`badge badge-sm ${shelter.className}`}>
            {landmark.shelterLevel === 'full_shelter' && (
              <Umbrella className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
            )}
            {shelter.label}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onSelectForDetails(landmark)}
            className="btn btn-sm btn-tertiary px-2"
          >
            <span>Details</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onCheckWeather(landmark)} className="btn btn-sm btn-ghost px-2">
            <Sun className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Forecast</span>
          </button>
          <button type="button" onClick={() => onGetDirections(landmark)} className="btn btn-sm btn-ghost px-2">
            <Navigation className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Route</span>
          </button>
        </div>
      </div>
    </article>
  );
};
