export interface ModelEntry {
  name: string;
  version: string;
  size_bytes: number;
  sha256: string;
  url: string;
  default?: boolean;
  min_device_ram_gb?: number;
}

export interface ModelManifest {
  models: ModelEntry[];
  updated_at?: string;
}

class ModelManifestService {
  private manifestUrl = 'https://model.yourdomain.com/models/index.json';
  private cached?: ModelManifest;

  async fetchManifest(): Promise<ModelManifest> {
    if (this.cached) return this.cached;
    const res = await fetch(this.manifestUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    const json = (await res.json()) as ModelManifest;
    this.cached = json;
    return json;
  }

  async chooseModel(preferSmall = true): Promise<ModelEntry> {
    const manifest = await this.fetchManifest();
    const sorted = [...manifest.models].sort((a, b) => a.size_bytes - b.size_bytes);
    if (preferSmall) return sorted[0];
    // otherwise choose default or largest
    const def = manifest.models.find(m => m.default);
    return def || sorted[sorted.length - 1];
  }
}

export const modelManifest = new ModelManifestService();