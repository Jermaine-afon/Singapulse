import { Landmark, RouteDetail } from '../types';

export function calculateMockRoute(
  startName: string,
  destination: Landmark,
  mode: 'walk' | 'pt' | 'cycle' | 'drive'
): RouteDetail {
  // Approximate distance based on realistic Singapore city distances
  const baseDistanceKm = 3.4;

  if (mode === 'walk') {
    const duration = Math.round(baseDistanceKm * 14); // ~45 mins
    const coveredPct = destination.shelterLevel === 'full_shelter' ? 75 : destination.shelterLevel === 'partial_shelter' ? 45 : 15;
    return {
      mode: 'walk',
      distanceKm: parseFloat(baseDistanceKm.toFixed(1)),
      durationMinutes: duration,
      coveredWalkwayPct: coveredPct,
      fareOrCost: 'Free ($0.00)',
      steps: [
        {
          instruction: `Depart from ${startName}, follow covered linkway towards the pedestrian crossing`,
          distanceMeters: 250,
          durationMinutes: 3,
          isCoveredWalkway: true
        },
        {
          instruction: `Cross at signalized pedestrian junction and head along tree-lined boulevard`,
          distanceMeters: 800,
          durationMinutes: 10,
          isCoveredWalkway: coveredPct > 30
        },
        {
          instruction: `Enter heritage shophouse / park corridor leading towards ${destination.nearestMrt}`,
          distanceMeters: 1200,
          durationMinutes: 16,
          isCoveredWalkway: true
        },
        {
          instruction: `Follow local directional sign to the entrance of ${destination.name}`,
          distanceMeters: 450,
          durationMinutes: 6,
          isCoveredWalkway: destination.shelterLevel === 'full_shelter'
        }
      ]
    };
  } else if (mode === 'pt') {
    // Public Transit (MRT & Bus)
    return {
      mode: 'pt',
      distanceKm: 4.8,
      durationMinutes: 22,
      coveredWalkwayPct: 85,
      fareOrCost: 'S$ 1.48 (EZ-Link / Contactless Visa/Mastercard)',
      steps: [
        {
          instruction: `Walk 2 mins into nearest MRT concourse via sheltered underground link`,
          distanceMeters: 150,
          durationMinutes: 2,
          isCoveredWalkway: true
        },
        {
          instruction: `Board Downtown or Circle Line train towards station near ${destination.nearestMrt}`,
          distanceMeters: 3800,
          durationMinutes: 14,
          isCoveredWalkway: true
        },
        {
          instruction: `Alight at ${destination.nearestMrt} and take designated exit`,
          distanceMeters: 200,
          durationMinutes: 2,
          isCoveredWalkway: true
        },
        {
          instruction: `Walk 4 mins along covered walkway directly to ${destination.name}`,
          distanceMeters: 350,
          durationMinutes: 4,
          isCoveredWalkway: destination.shelterLevel !== 'open_air'
        }
      ]
    };
  } else if (mode === 'cycle') {
    // Cycling via PCN (Park Connector Network)
    return {
      mode: 'cycle',
      distanceKm: 3.8,
      durationMinutes: 15,
      coveredWalkwayPct: 20,
      fareOrCost: '~S$ 2.00 (Anywheel / HelloBike share)',
      steps: [
        {
          instruction: `Unlock shared bicycle at designated yellow parking box`,
          distanceMeters: 50,
          durationMinutes: 1,
          isCoveredWalkway: false
        },
        {
          instruction: `Ride along designated Park Connector Network (PCN) path`,
          distanceMeters: 2800,
          durationMinutes: 10,
          isCoveredWalkway: false
        },
        {
          instruction: `Transition to pedestrian shared trail near ${destination.neighborhood}`,
          distanceMeters: 900,
          durationMinutes: 4,
          isCoveredWalkway: false
        }
      ]
    };
  } else {
    // Drive / Taxi / Grab
    return {
      mode: 'drive',
      distanceKm: 4.2,
      durationMinutes: 12,
      coveredWalkwayPct: 90,
      fareOrCost: 'S$ 9.00 - S$ 14.00 (Grab / ComfortDelGro Taxi)',
      steps: [
        {
          instruction: `Pick up at designated sheltered taxi stand / hotel driveway`,
          distanceMeters: 100,
          durationMinutes: 1,
          isCoveredWalkway: true
        },
        {
          instruction: `Travel via arterial expressway towards ${destination.neighborhood}`,
          distanceMeters: 3700,
          durationMinutes: 9,
          isCoveredWalkway: true
        },
        {
          instruction: `Drop off directly at ${destination.address}`,
          distanceMeters: 100,
          durationMinutes: 2,
          isCoveredWalkway: true
        }
      ]
    };
  }
}
