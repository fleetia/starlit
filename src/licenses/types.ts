export type LicenseEntry = {
  name: string;
  version?: string;
  license: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  notices: { name: string; text: string }[];
};
