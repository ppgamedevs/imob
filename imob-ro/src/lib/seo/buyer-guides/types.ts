export type BuyerGuideSection = {
  title: string;
  paragraphs: string[];
  checklist?: string[];
};

export type BuyerGuide = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  sections: BuyerGuideSection[];
  faq: { question: string; answer: string }[];
  /** Linkuri spre /zona/... utile contextului */
  zoneLinks?: { href: string; label: string }[];
};
