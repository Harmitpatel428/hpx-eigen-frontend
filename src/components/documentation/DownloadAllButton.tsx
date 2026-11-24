import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from '../notifications/notify';
import { tokenStorage } from '../../auth/storage/tokenStorage';
import { API_BASE_URL } from '../../services/http';

/**
 * Streams the case's documents as one ZIP. Tracks received bytes against the X-Total-Bytes header for a
 * determinate in-button progress (indeterminate only if the server reports no total).
 *
 * ponytail: the whole ZIP is buffered in browser memory (fetch chunks → Blob) before the save prompt — fine
 * for the 5 MB-capped documents here. If cases ever hold hundreds of MB, switch to the File System Access
 * streaming API (showSaveFilePicker + WritableStream) to avoid holding it all in memory.
 */
export function DownloadAllButton({ caseId, docCount }: { caseId: string; docCount: number }) {
  const [progress, setProgress] = useState<number | null>(null); // null = idle; -1 = indeterminate; 0-100 = %

  const busy = progress !== null;

  const run = async () => {
    setProgress(0);
    try {
      const token = tokenStorage.get()?.accessToken;
      const res = await fetch(`${API_BASE_URL}/api/v1/documentation/cases/${caseId}/documents/download-all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok || !res.body) {
        throw new Error(res.status === 409 ? 'This case has no documents to download.' : 'Could not prepare the download.');
      }

      const total = Number(res.headers.get('X-Total-Bytes')) || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setProgress(total > 0 ? Math.min(99, Math.round((received / total) * 100)) : -1);
        }
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' });
      const cd = res.headers.get('Content-Disposition') ?? '';
      const filename = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? 'documents.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Documents downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setProgress(null);
    }
  };

  const label = !busy
    ? 'Download All'
    : progress === -1 ? 'Downloading…'
    : progress === 0 ? 'Preparing…'
    : `Downloading ${progress}%`;

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={docCount === 0 || busy}
      title={docCount === 0 ? 'No files uploaded yet' : undefined}
      onClick={run}
      style={{ height: 28, paddingInline: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <Download size={13} /> {label}
    </button>
  );
}
