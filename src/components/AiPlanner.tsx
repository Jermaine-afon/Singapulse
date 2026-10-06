import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Landmark, StartPoint } from '../types';
import { ItineraryPlan, PlannerChatMessage, PlannerPace, PlanStop } from '../types/planner';
import { requestPlan } from '../services/plannerService';
import { StartPointPicker } from './StartPointPicker';
import {
  ArrowRight,
  Loader2,
  ArrowUp,
  Utensils,
  Coffee,
  MapPin,
  Umbrella,
  BookmarkPlus,
  Check,
  AlertTriangle,
  CloudSun,
  Info,
} from 'lucide-react';

interface AiPlannerProps {
  landmarks: Landmark[];
  savedLandmarks: Landmark[];
  savedIds: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  startPoint: StartPoint;
  onStartPointChange: (point: StartPoint) => void;
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

const PACE_OPTIONS: { value: PlannerPace; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: '3–4 places' },
  { value: 'balanced', label: 'Balanced', hint: '4–6 places' },
  { value: 'packed', label: 'Packed', hint: '6–8 places' },
];

const CHAT_SUGGESTIONS = ['Make it more relaxed', 'More indoor spots', 'Add a hawker lunch'];

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const addMinutes = (time: string, minutes: number) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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
  // Bumped on every new plan so the timeline replays its entrance
  const [planVersion, setPlanVersion] = useState(0);

  const chatLogRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const landmarkById = useMemo(() => new Map(landmarks.map((lm) => [lm.id, lm])), [landmarks]);

  // Keep the newest chat message in view without scrolling the whole page
  useEffect(() => {
    const log = chatLogRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, isLoading]);

  const timeWindowInvalid = startTime >= endTime;

  const preferences = {
    date: selectedDate,
    startTime,
    endTime,
    interests,
    pace,
    startPoint: startPoint.name,
    mustVisitIds: includeTrail ? savedLandmarks.map((lm) => lm.id) : [],
    weatherSummary,
  };

  const runPlanner = async (nextMessages: PlannerChatMessage[], currentPlan: ItineraryPlan | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestPlan({ preferences, messages: nextMessages, currentPlan });
      setPlan(res.plan);
      setPlanVersion((v) => v + 1);
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

  const handleGenerate = async () => {
    if (isLoading || timeWindowInvalid) return;
    // A fresh plan starts a fresh conversation; runPlanner replaces `messages` only on success,
    // so a failed attempt keeps the existing plan and chat intact
    const ok = await runPlanner([{ role: 'user', content: 'Plan my day based on my trip preferences.' }], null);
    if (ok) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
  const generating = isLoading && !plan;

  return (
    <>
      {/* Hero band: the planner card is the hero */}
      <section className="bg-canvas-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] gap-10 lg:gap-16 items-start">
          <div className="lg:pt-10">
            <h1 className="display text-[clamp(3rem,7.5vw,5.75rem)] text-ink">Plan a good day in Singapore.</h1>
            <p className="mt-6 text-lg sm:text-xl text-body max-w-md leading-relaxed">
              Tell Singapulse your time, pace and interests. It builds a timed day from real places, with sheltered stops
              when rain or heat is likely.
            </p>
            {weatherSummary && (
              <p className="mt-8 flex items-start gap-3 text-base text-body max-w-md">
                <CloudSun className="w-5 h-5 mt-0.5 shrink-0 text-ink" aria-hidden="true" />
                <span>{weatherSummary}</span>
              </p>
            )}
          </div>

          <form
            className="bg-canvas rounded-3xl p-6 sm:p-8 ring-1 ring-ink"
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
            aria-labelledby="planner-form-title"
          >
            <h2 id="planner-form-title" className="text-2xl font-semibold text-ink">
              Your day
            </h2>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="field-label">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="input nums"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="field-label">From</span>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input nums" />
                </label>
                <label className="block">
                  <span className="field-label">To</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input nums"
                    aria-invalid={timeWindowInvalid}
                  />
                </label>
              </div>
              {timeWindowInvalid && (
                <p className="-mt-2 text-sm font-semibold text-negative-darkest">End time must be after start time.</p>
              )}

              <StartPointPicker value={startPoint} onChange={onStartPointChange} />

              <fieldset>
                <legend className="field-label">Interests</legend>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={interests.includes(interest)}
                      onClick={() => toggleInterest(interest)}
                      className="chip"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="field-label">Pace</legend>
                <div className="grid grid-cols-3 gap-1 p-1 bg-canvas-soft rounded-2xl">
                  {PACE_OPTIONS.map((option) => {
                    const active = pace === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPace(option.value)}
                        className={`cursor-pointer rounded-xl px-2 py-2 text-center transition-colors ${
                          active ? 'bg-canvas text-ink shadow-[0_1px_2px_rgb(14_15_12/0.12)]' : 'text-body hover:text-ink'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs text-mute">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {savedLandmarks.length > 0 && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTrail}
                    onChange={(e) => setIncludeTrail(e.target.checked)}
                    className="mt-1 w-4 h-4 shrink-0"
                  />
                  <span className="text-sm text-body">
                    <span className="font-semibold text-ink">Include my saved places ({savedLandmarks.length})</span>
                    <span className="block mt-0.5 line-clamp-2">{savedLandmarks.map((lm) => lm.name).join(', ')}</span>
                  </span>
                </label>
              )}
            </div>

            {error && !plan && (
              <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-negative-pale px-4 py-3 text-sm text-negative-darkest">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" disabled={isLoading || timeWindowInvalid} className="btn btn-primary w-full mt-6">
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Planning your day…
                </>
              ) : (
                <>
                  {plan ? 'Plan a new day' : 'Plan my day'}
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Results band: the timeline, with chat beside it */}
      {(plan || generating) && (
        <section ref={resultsRef} className="bg-canvas scroll-mt-20" aria-busy={isLoading}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-start">
            {!plan ? (
              <div className="space-y-4" aria-live="polite">
                <p className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Planning your day…
                </p>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-5 animate-pulse">
                    <div className="w-14 h-5 rounded bg-canvas-soft" />
                    <div className="flex-1 h-24 rounded-3xl bg-canvas-soft" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                  <div className="min-w-0">
                    <h2 className="display text-4xl sm:text-5xl text-ink">{plan.title}</h2>
                    {plan.summary && <p className="mt-3 text-lg text-body max-w-xl">{plan.summary}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSaveToTrail(unsavedPlanIds)}
                    disabled={unsavedPlanIds.length === 0}
                    className={`btn shrink-0 ${unsavedPlanIds.length === 0 ? 'btn-secondary disabled:opacity-100' : 'btn-primary'}`}
                  >
                    {unsavedPlanIds.length === 0 ? (
                      <>
                        <Check className="w-5 h-5" aria-hidden="true" />
                        All stops saved
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-5 h-5" aria-hidden="true" />
                        Save {unsavedPlanIds.length} stop{unsavedPlanIds.length > 1 ? 's' : ''} to My Trail
                      </>
                    )}
                  </button>
                </div>

                {warnings.length > 0 && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-warning-pale px-5 py-4 text-sm text-warning-content">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <ul className="space-y-1">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <ol key={planVersion} className={`mt-10 transition-opacity ${isLoading ? 'opacity-40' : ''}`}>
                  {plan.stops.map((stop, index) => (
                    <TimelineStop
                      key={`${stop.time}-${stop.title}`}
                      index={index}
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
              <aside className="card-soft lg:sticky lg:top-24" aria-labelledby="refine-title">
                <h2 id="refine-title" className="text-xl font-semibold text-ink">
                  Change your plan
                </h2>
                <p className="mt-1 text-sm text-body">Ask for anything, like a later start or fewer museums.</p>

                <div ref={chatLogRef} className="mt-5 space-y-3 max-h-80 overflow-y-auto pr-1" aria-live="polite">
                  {visibleMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <p
                        className={`max-w-[88%] px-4 py-2.5 text-[15px] leading-snug ${
                          msg.role === 'user'
                            ? 'bg-ink text-canvas rounded-3xl rounded-br-lg'
                            : 'bg-canvas text-ink rounded-3xl rounded-bl-lg'
                        }`}
                      >
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {isLoading && (
                    <p className="flex items-center gap-2 text-sm text-body">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Updating your plan…
                    </p>
                  )}
                </div>

                {error && plan && (
                  <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-negative-pale px-4 py-3 text-sm text-negative-darkest">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error}</span>
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {CHAT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendChat(suggestion)}
                      className="chip disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="mt-4 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={1000}
                    placeholder="e.g. Swap the museum for a park"
                    aria-label="Ask to change your plan"
                    className="input flex-1 min-w-0 border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !chatInput.trim()}
                    aria-label="Send"
                    className="btn btn-icon btn-dark shrink-0"
                  >
                    <ArrowUp className="w-5 h-5" aria-hidden="true" />
                  </button>
                </form>
              </aside>
            )}
          </div>
        </section>
      )}
    </>
  );
};

const TimelineStop: React.FC<{
  index: number;
  stop: PlanStop;
  landmark?: Landmark;
  isLast: boolean;
  onSelectForDetails: (landmark: Landmark) => void;
  onShowOnMap: (landmark: Landmark) => void;
}> = ({ index, stop, landmark, isLast, onSelectForDetails, onShowOnMap }) => {
  const Icon = stop.type === 'meal' ? Utensils : stop.type === 'break' ? Coffee : MapPin;

  return (
    <li className="grid grid-cols-[4rem_2.75rem_minmax(0,1fr)] sm:grid-cols-[5rem_3.25rem_minmax(0,1fr)] animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="pt-4 pr-2 sm:pr-3 text-right nums">
        <span className="block text-lg sm:text-xl font-black tracking-tight text-ink">{stop.time}</span>
        <span className="block text-xs text-mute">{addMinutes(stop.time, stop.durationMinutes)}</span>
      </div>

      <div className="flex flex-col items-center">
        <span
          className={`mt-3 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            landmark ? 'bg-ink text-primary' : 'bg-canvas-soft text-ink'
          }`}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        {!isLast && <span className="w-px flex-1 bg-canvas-line my-1" aria-hidden="true" />}
      </div>

      <div className={isLast ? '' : 'pb-6'}>
        <div className={landmark ? 'rounded-3xl bg-canvas-soft p-5' : 'px-1 py-3'}>
          <div className="flex items-start justify-between gap-3">
            <h3 className={landmark ? 'text-lg font-semibold text-ink' : 'text-base font-semibold text-ink'}>{stop.title}</h3>
            <span className="shrink-0 text-sm text-body nums">{formatDuration(stop.durationMinutes)}</span>
          </div>

          {landmark && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-body">
              <span>{landmark.neighborhood}</span>
              {landmark.shelterLevel === 'full_shelter' && (
                <span className="badge badge-sm badge-positive">
                  <Umbrella className="w-3.5 h-3.5" aria-hidden="true" />
                  Rain-safe
                </span>
              )}
            </div>
          )}

          {stop.note && <p className="mt-2 text-[15px] text-body leading-relaxed">{stop.note}</p>}

          {landmark && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onSelectForDetails(landmark)} className="btn btn-sm btn-tertiary">
                Details
              </button>
              <button type="button" onClick={() => onShowOnMap(landmark)} className="btn btn-sm btn-ghost">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                Show on map
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
