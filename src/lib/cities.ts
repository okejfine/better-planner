export const CITIES = [
  { id: "lindon", label: "Lindon", lat: 40.341, lon: -111.7211 },
  { id: "highland", label: "Highland", lat: 40.4291, lon: -111.7958 },
  { id: "lehi", label: "Lehi", lat: 40.3916, lon: -111.8508 },
  { id: "orem", label: "Orem", lat: 40.2969, lon: -111.6946 },
  { id: "alpine", label: "Alpine", lat: 40.4533, lon: -111.7741 },
] as const;

export type CityId = (typeof CITIES)[number]["id"];
