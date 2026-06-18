export interface AnkiCard {
  id?: string;
  front: string;
  back: string;
  likes?: string[];
  proposedChange?: {
    proposedFront: string;
    proposedBack: string;
    proposedBy: string;
    createdAt: string;
  };
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  content: string; // Markdown details
  tags: string[];
  anki: AnkiCard[];
  defaultTier: 1 | 2 | 3;
  proposedChange?: {
    proposedDescription?: string;
    proposedContent?: string;
    proposedBy: string;
    createdAt: string;
  };
}

export interface Vote {
  concept_id: string;
  tag_id: string;
  user_id: string;
  tier_value: 1 | 2 | 3;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  tag?: string;
  sharedBy: string;
  createdAt: string;
}

export interface Reply {
  id: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommentHeap {
  id: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  replies: Reply[];
}

export interface MemberBio {
  username: string;
  name: string;
  bio: string;
}
