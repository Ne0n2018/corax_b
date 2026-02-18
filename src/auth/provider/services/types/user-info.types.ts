export type TypeUserInfo = {
  id: string;
  name: string;
  email: string;
  access_token?: string | null;
  refresh_token?: string;
  expires_in?: number;
  provider: string;
};
