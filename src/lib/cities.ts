export const CITIES = [
  { id: "lindon", label: "Lindon", lat: 40.341, lon: -111.7211 },
  { id: "highland", label: "Highland", lat: 40.4291, lon: -111.7958 },
  { id: "lehi", label: "Lehi", lat: 40.3916, lon: -111.8508 },
  { id: "orem", label: "Orem", lat: 40.2969, lon: -111.6946 },
  { id: "alpine", label: "Alpine", lat: 40.4533, lon: -111.7741 },
  { id: "washington_dc", label: "Washington, DC", lat: 38.9072, lon: -77.0369 },
  { id: "holiday_ut", label: "Holiday, UT", lat: 40.6208, lon: -111.889 },
  { id: "cabo_mx", label: "Cabo, MX", lat: 22.8905, lon: -109.9167 },
  { id: "honolulu_hi", label: "Honolulu, HI", lat: 21.3099, lon: -157.8581 },
  { id: "maui_hi", label: "Maui, HI", lat: 20.8893, lon: -156.4729 },
  { id: "cancun_mx", label: "Cancun, MX", lat: 21.1619, lon: -86.8515 },
  { id: "huntington_beach_ca", label: "Huntington Beach, CA", lat: 33.6595, lon: -117.9988 },
] as const;

export type CityId = (typeof CITIES)[number]["id"];
