import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark } from '../types';
import { ItineraryPlan, PlannerChatMessage, PlannerPace, PlanStop } from '../types/planner';
import { POPULAR_START_POINTS } from '../data/landmarks';
import { requestPlan } from '../services/plannerService';
import {
  Sparkles,
  Loader2,
  Send,
  Utensils,
  Coffee,
  MapPin,
  Info,
  Umbrella,
  Clock,
  BookmarkPlus,
  Check,
  AlertTriangle,
  CloudSun,
} from 'lucide-react';

interface AiPlannerProps {
  landmarks: Landmark[];
  savedLandmarks: Landmark[];
  savedIds: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  startPoint: string;
  onStartPointChange: (name: string) => void;
  weatherSummary: string;
  onSelectForDetails: (landmark: Landmark) => void;
  onShowOnMap: (landmark: Landmark) => void;
  onSaveToTrail: (ids: string[]) => void;
}

const INTEREST_OPTIONS = [
  'Heritage & history',
  'Architecture',
  'Nature & parks',
  'Local food',
  'Museums & art',
  'Coastal & islands',
  'Photo spots',
  'Family-friendly',
];

const PACE_OPTIONS: { value: PlannerPace; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'packed', label: 'Packed' },
];

const CHAT_SUGGESTIONS = ['Make it more relaxed', 'Swap in more indoor spots', 'Add a hawker lunch nearby'];

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const AiPlanner: React.FC<AiPlannerProps> = ({
  landmarks,
  savedLandmarks,
  savedIds,
  selectedDate,
  onDateChange,
  startPoint,
  onStartPointChange,
  weatherSummary,
  onSelectForDetails,
  onShowOnMap,
  onSaveToTrail,
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [interests, setInterests] = useState<string[]>([]);
  const [pace, setPace] = useState<PlannerPace>('balanced');
  const [includeTrail, setIncludeTrail] = useState(true);

  const [plan, setPlan] = useState<ItineraryPlan | null>(null);
  const [messages, setMessages] = useState<PlannerChatMessage[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const landmarkById = useMemo(() => new Map(landmarks.map((lm) => [lm.id, lm])), [landmarks]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const timeWindowInvalid = startTime >= endTime;

  const preferences = {
    date: selectedDate,
    startTime,
    endTime,
    interests,
    pace,
    startPoint,
    mustVisitIds: includeTrail ? savedLandmarks.map((lm) => lm.id) : [],
    weatherSummary,
  };

  const runPlanner = async (nextMessages: PlannerChatMessage[], currentPlan: ItineraryPlan | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestPlan({ preferences, messages: nextMessages, currentPlan });
      setPlan(res.plan);
      setWarnings(res.warnings ?? []);
      setMessages([...nextMessages, { role: 'assistant', content: res.reply }]);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (isLoading || timeWindowInvalid) return;
    // A fresh plan starts a fresh conversation; runPlanner replaces `messages` only on success,
    // so a failed attempt keeps the existing plan and chat intact
    runPlanner([{ role: 'user', content: 'Plan my day based on my trip preferences.' }], null);
  };

  const handleSendChat = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading || !plan) return;
    const nextMessages: PlannerChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setChatInput('');
    const ok = await runPlanner(nextMessages, plan);
    if (!ok) {
      // Roll back so the user can retry without retyping
      setMessages(messages);
      setChatInput(content);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]));
  };

  const planLandmarkIds = plan?.stops.flatMap((s) => (s.landmarkId ? [s.landmarkId] : [])) ?? [];
  const unsavedPlanIds = planLandmarkIds.filter((id) => !savedIds.includes(id));

  // The first user message is the automatic "plan my day" trigger, so it isn't shown
  const visibleMessages = messages.slice(1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

      {/* Trip preferences form */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5 lg:sticky lg:top-24">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Itinerary Planner</span>
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900 mt-0.5">Plan your day</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tell the AI how you like to travel. It plans around Singapulse's landmarks and the weather.
          </p>
        </div>

        {/* Date & time window */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700 space-y-1">
            <span>Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-slate-700 space-y-1">
              <span>From</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 space-y-1">
              <span>To</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </label>
          </div>
        </div>
        {timeWindowInvalid && <p className="text-xs text-rose-600 -mt-3">End time must be after start time.</p>}

        {/* Start point */}
        <label className="block text-xs font-medium text-slate-700 space-y-1">
          <span>Starting from</span>
          <select
            value={startPoint}
            onChange={(e) => onStartPointChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {POPULAR_START_POINTS.map((sp) => (
              <option key={sp.name} value={sp.name}>
                {sp.name}
              </option>
            ))}
          </select>
        </label>

        {/* Interests */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">Interests</legend>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_OPTIONS.map((interest) => {
              const active = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleInterest(interest)}
                  className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Pace */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">Pace</legend>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {PACE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={pace === option.value}
                onClick={() => setPace(option.value)}
                className={`cursor-pointer py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  pace === option.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Include My Trail */}
        {savedLandmarks.length > 0 && (
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTrail}
              onChange={(e) => setIncludeTrail(e.target.checked)}
              className="mt-0.5 accent-emerald-600"
            />
            <span>
              <span className="font-medium">Include my saved places ({savedLandmarks.length})</span>
              <span className="block text-slate-500 mt-0.5 line-clamp-2">
                {savedLandmarks.map((lm) => lm.name).join(', ')}
              </span>
            </span>
          </label>
        )}

        {/* Weather context */}
        {weatherSummary && (
          <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{weatherSummary}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || timeWindowInvalid}
          className="cursor-pointer w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
        >
          {isLoading && !plan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
          <span>{plan ? 'Start a new plan' : 'Generate my plan'}</span>
        </button>
      </div>

      {/* Plan + chat */}
      <div className="space-y-4 min-w-0">
        {error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!plan && !isLoading && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <Sparkles className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold font-display text-slate-900 mt-3">Your AI-planned day appears here</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Set your preferences and generate a plan. Then chat with the AI to tweak it, for example
              "swap the museum for something outdoors".
            </p>
          </div>
        )}

        {!plan && isLoading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4" aria-busy="true">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Planning your day…</span>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-12 h-4 bg-slate-100 rounded" />
                <div className="flex-1 h-16 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {plan && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Plan header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold font-display text-slate-900">{plan.title}</h3>
                {plan.summary && <p className="text-sm text-slate-600 mt-0.5">{plan.summary}</p>}
              </div>
              <button
                type="button"
                onClick={() => onSaveToTrail(unsavedPlanIds)}
                disabled={unsavedPlanIds.length === 0}
                className="cursor-pointer shrink-0 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-50 disabled:text-emerald-800 disabled:border disabled:border-emerald-200 disabled:cursor-default text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {unsavedPlanIds.length === 0 ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                <span>
                  {unsavedPlanIds.length === 0
                    ? 'All stops in My Trail'
                    : `Save ${unsavedPlanIds.length} stop${unsavedPlanIds.length > 1 ? 's' : ''} to My Trail`}
                </span>
              </button>
            </div>

            {warnings.length > 0 && (
              <div className="mx-5 mt-4 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <ul className="space-y-0.5">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline */}
            <ol className={`p-5 space-y-0 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
              {plan.stops.map((stop, index) => (
                <TimelineStop
                  key={`${stop.time}-${stop.title}`}
                  stop={stop}
                  landmark={stop.landmarkId ? landmarkById.get(stop.landmarkId) : undefined}
                  isLast={index === plan.stops.length - 1}
                  onSelectForDetails={onSelectForDetails}
                  onShowOnMap={onShowOnMap}
                />
              ))}
            </ol>
          </div>
        )}

        {/* Refine chat */}
        {plan && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Refine with AI</div>

            <div className="space-y-2 max-h-72 overflow-y-auto" aria-live="polite">
              {visibleMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating your plan…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CHAT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendChat(suggestion)}
                  className="cursor-pointer px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(chatInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={1000}
                placeholder="e.g. Swap the museum for something outdoors"
                aria-label="Ask the AI to change your plan"
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="submit"
                disabled={isLoading || !chatInput.trim()}
                aria-label="Send"
                className="cursor-pointer p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineStop: React.FC<{
  stop: PlanStop;
  landmark?: Landmark;
  isLast: boolean;
  onSelectForDetails: (landmark: Landmark) => void;
  onShowOnMap: (landmark: Landmark) => void;
}> = ({ stop, landmark, isLast, onSelectForDetails, onShowOnMap }) => {
  const Icon = stop.type === 'meal' ? Utensils : stop.type === 'break' ? Coffee : MapPin;

  return (
    <li className="flex gap-3 sm:gap-4">
      <div className="w-12 shrink-0 pt-2.5 text-right font-mono text-xs font-semibold text-slate-700">{stop.time}</div>

      <div className="flex flex-col items-center">
        <span
          className={`mt-2 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            landmark ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        {!isLast && <span className="w-px flex-1 bg-slate-200 my-1" />}
      </div>

      <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-5'}`}>
        <div className={`rounded-xl p-3 ${landmark ? 'border border-slate-200' : 'bg-slate-50'}`}>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{stop.title}</h4>
            <span className="shrink-0 flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              {formatDuration(stop.durationMinutes)}
            </span>
          </div>

          {landmark && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-500">
              <span>{landmark.neighborhood}</span>
              {landmark.shelterLevel === 'full_shelter' && (
                <span className="flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <Umbrella className="w-3 h-3 text-emerald-600" />
                  Rain-Safe
                </span>
              )}
            </div>
          )}

          {stop.note && <p className="text-xs text-slate-600 mt-1.5">{stop.note}</p>}

          {landmark && (
            <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onSelectForDetails(landmark)}
                className="cursor-pointer text-emerald-700 hover:text-emerald-900"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => onShowOnMap(landmark)}
                className="cursor-pointer text-slate-600 hover:text-slate-900"
              >
                Show on map
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
