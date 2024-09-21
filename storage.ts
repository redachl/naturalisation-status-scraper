export type StatusResponse = {
  dossier?: {
    id: number;
    numero_national: string;
    statut: string;
    date_statut: string;
    numero_timbre: string;
  };
};

export async function readStorageFile(path: string): Promise<StatusResponse[]> {
  // read file from path, then parse it as JSON
  const file = Bun.file(path);

  const exists = await file.exists();
  if (!exists) {
    return [];
  }

  const text = await file.text();
  if (text === "") {
    return [];
  }

  return JSON.parse(text) as StatusResponse[];
}

export async function writeStorageFile(
  path: string,
  data: StatusResponse[]
): Promise<void> {
  await Bun.write(path, JSON.stringify(data, null, 2));
}
