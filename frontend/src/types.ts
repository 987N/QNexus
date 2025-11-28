export interface Torrent {
  hash: string;
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  eta: number;
  state: string;
  added_on: number;
  completion_on: number;
  tracker: string;
  category: string;
  tags: string;
  downloaded: number;
  uploaded: number;
  ratio: number;
  num_seeds: number;
  num_complete: number;
  num_leechs: number;
  num_incomplete: number;
  save_path: string;
}
