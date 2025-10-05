export interface ReviewSetCharacterAssociationCreate {
  review_set_id: string;
  character_id: string;
}

export interface ReviewSetCharacterAssociationOut {
  review_set_id: string;
  character_id: string;
}

export interface CharacterForReviewSet {
  id: string;
  name: string;
  thumbnail_url?: string | null;
}

export interface ReviewSetInDB {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description?: string | null;
  project_id: string;
}

export interface ReviewSetCharacterAssociationWithDetails {
  review_set_id: string;
  character_id: string;
  review_set: ReviewSetInDB;
  character: CharacterForReviewSet;
}
