export interface VoiceOption {
  id: string;
  description: string;
}

export interface VoiceCatalog {
  male: VoiceOption[];
  female: VoiceOption[];
}

export interface StyleOption {
  value: string;
  label: string;
  instruction?: string;
}

export type TrackKind = "narration" | "podcast";

export interface Track {
  id: string;
  title: string;
  voice: string;
  style: string;
  url: string;
  blob: Blob;
  createdAt: number;
  kind: TrackKind;
}

export interface ApiCallOptions {
  currentApiKey: string;
  savedApiKeys: string[];
}

export interface SpeakerConfig {
  name: string;
  voice: string;
}


export interface StoredTrack {
  id: string;
  title: string;
  voice: string;
  style: string;
  createdAt: number;
  kind: TrackKind;
  url: string;
}
