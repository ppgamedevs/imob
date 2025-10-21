export type DiscoverParams = {
  q?: string;
  area?: string[]; // areaSlug[]
  priceMin?: number;
  priceMax?: number;
  eurm2Min?: number;
  eurm2Max?: number;
  m2Min?: number;
  m2Max?: number;
  roomsMin?: number;
  roomsMax?: number;
  yearMin?: number;
  yearMax?: number;
  metroMaxM?: number; // distMetroM <=
  underpriced?: boolean;
  pageSize?: number; // default 20
  cursor?: string | null;
};
