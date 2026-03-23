import { memo, useCallback } from 'react';
import { useWorldStore } from '../store/useWorldStore';

interface PermissionCardProps {
  id: string;
  requesterName: string;
  requesterColor: string;
  dataType: string;
  onAllow: () => void;
  onDeny: () => void;
  onAllowSession: () => void;
}

function PermissionCard({
  id,
  requesterName,
  requesterColor,
  dataType,
  onAllow,
  onDeny,
  onAllowSession,
}: PermissionCardProps) {
  return (
    <div
      className="panel-glass rounded-lg p-4 shadow-lg w-72 animate-slide-in"
      data-testid={`permission-card-${id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: requesterColor }}
        />
        <span className="text-white font-medium text-sm">{requesterName}</span>
      </div>
      <p className="text-slate-300 text-xs mb-3">
        Wants access to your <span className="text-indigo-400 font-medium">{dataType}</span> data
      </p>
      <div className="flex gap-2">
        <button
          onClick={onAllow}
          className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-medium transition-colors"
          data-testid={`perm-allow-${id}`}
        >
          Allow
        </button>
        <button
          onClick={onAllowSession}
          className="flex-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium transition-colors"
          data-testid={`perm-session-${id}`}
        >
          Session
        </button>
        <button
          onClick={onDeny}
          className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-medium transition-colors"
          data-testid={`perm-deny-${id}`}
        >
          Deny
        </button>
      </div>
    </div>
  );
}

function PermissionRequestOverlayInner() {
  const requests = useWorldStore((s) => s.permissionRequests);
  const resolveRequest = useWorldStore((s) => s.resolvePermissionRequest);

  const handleAllow = useCallback(
    (id: string) => resolveRequest(id),
    [resolveRequest],
  );

  const handleDeny = useCallback(
    (id: string) => resolveRequest(id),
    [resolveRequest],
  );

  const handleAllowSession = useCallback(
    (id: string) => resolveRequest(id),
    [resolveRequest],
  );

  if (requests.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-40 flex flex-col gap-3"
      data-testid="permission-overlay"
    >
      {requests.map((req) => (
        <PermissionCard
          key={req.id}
          id={req.id}
          requesterName={req.requesterName}
          requesterColor={req.requesterColor}
          dataType={req.dataType}
          onAllow={() => handleAllow(req.id)}
          onDeny={() => handleDeny(req.id)}
          onAllowSession={() => handleAllowSession(req.id)}
        />
      ))}
    </div>
  );
}

export const PermissionRequestOverlay = memo(PermissionRequestOverlayInner);
