import { useEffect, useRef, useState } from 'react';

import {
  disconnectTabGroupsAccess,
  getBookmarkDestinations,
  getOpenTabGroups,
  hasTabGroupsAccess,
  importOpenTabGroups,
  requestTabGroupImportAccess,
} from '../../platform/tabGroups/importOpenTabGroups';
import type {
  BookmarkDestination,
  OpenTabGroupSnapshot,
  TabGroupImportResult,
} from '../../platform/tabGroups/importOpenTabGroups';
import {
  createTabGroupImportPermissionLease,
  type TabGroupImportPermissionLease,
} from '../../platform/tabGroups/tabGroupImportPermissionLease';

type PermissionChangeListener = (
  permissions: chrome.permissions.Permissions,
) => void;

type PermissionChangeEvent = {
  addListener: (listener: PermissionChangeListener) => void;
  removeListener?: (listener: PermissionChangeListener) => void;
};

type TabGroupImportMessages = {
  disconnectFailed: string;
  importFailed: string;
  permissionDenied: string;
  refreshFailed: string;
  selectedRequired: string;
  unavailable: string;
  untitled: string;
};

type UseTabGroupImportOptions = {
  copy: TabGroupImportMessages;
  defaultDestinationId?: string;
  onBookmarksImported?: () => Promise<void>;
};

type UseTabGroupImportResult = {
  destinations: BookmarkDestination[];
  destinationId: string;
  groups: OpenTabGroupSnapshot[];
  handleCloseImporter: () => Promise<void>;
  handleDialogOpenChange: (isOpen: boolean) => void;
  handleDisconnect: () => Promise<void>;
  handleGroupToggle: (groupId: number, isChecked: boolean) => void;
  handleImport: () => Promise<void>;
  handleOpenImporter: () => Promise<void>;
  hasReleaseFailure: boolean;
  isConnected: boolean;
  isDialogOpen: boolean;
  isImporting: boolean;
  isLoading: boolean;
  releaseTemporaryAccess: () => Promise<void>;
  result: TabGroupImportResult | null;
  selectedGroupIds: Set<number>;
  setDestinationId: (destinationId: string) => void;
  status: string | null;
};

export function useTabGroupImport({
  copy,
  defaultDestinationId,
  onBookmarksImported,
}: UseTabGroupImportOptions): UseTabGroupImportResult {
  const isMountedRef = useRef(true);
  const permissionLeaseRef = useRef<TabGroupImportPermissionLease | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [groups, setGroups] = useState<OpenTabGroupSnapshot[]>([]);
  const [destinations, setDestinations] = useState<BookmarkDestination[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [result, setResult] = useState<TabGroupImportResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [hasReleaseFailure, setHasReleaseFailure] = useState(false);

  useEffect(() => {
    let isActive = true;

    const syncConnectionState = async (): Promise<void> => {
      const hasAccess = await hasTabGroupsAccess();

      if (isActive) {
        setIsConnected(hasAccess);
      }
    };
    const handlePermissionChange = (): void => {
      void syncConnectionState();
    };
    const permissionEvents: {
      onAdded?: PermissionChangeEvent;
      onRemoved?: PermissionChangeEvent;
    } | null = typeof chrome === 'undefined' ? null : chrome.permissions;

    isMountedRef.current = true;
    void syncConnectionState();
    permissionEvents?.onAdded?.addListener(handlePermissionChange);
    permissionEvents?.onRemoved?.addListener(handlePermissionChange);

    return () => {
      isActive = false;
      isMountedRef.current = false;

      permissionEvents?.onAdded?.removeListener?.(handlePermissionChange);
      permissionEvents?.onRemoved?.removeListener?.(handlePermissionChange);
      permissionLeaseRef.current?.dispose();
      permissionLeaseRef.current = null;
    };
  }, []);

  async function releaseTemporaryAccess(): Promise<void> {
    let lease = permissionLeaseRef.current;

    if (!lease) {
      try {
        lease = createTabGroupImportPermissionLease();
        permissionLeaseRef.current = lease;
      } catch {
        if (isMountedRef.current) {
          setHasReleaseFailure(true);
        }
        return;
      }
    }

    const wasReleased = await lease.release();

    if (permissionLeaseRef.current === lease) {
      permissionLeaseRef.current = null;

      if (!wasReleased) {
        lease.dispose();
      }
    }

    if (isMountedRef.current) {
      setHasReleaseFailure(!wasReleased);
    }
  }

  async function handleOpenImporter(): Promise<void> {
    if (permissionLeaseRef.current) {
      return;
    }

    setIsLoading(true);
    setStatus(null);
    setResult(null);
    setHasReleaseFailure(false);
    let shouldKeepTabsAccess = false;

    try {
      permissionLeaseRef.current = createTabGroupImportPermissionLease();
      const wasGranted = await requestTabGroupImportAccess();

      if (!isMountedRef.current) {
        return;
      }

      const hasAccess = await hasTabGroupsAccess();

      if (!isMountedRef.current) {
        return;
      }

      setIsConnected(hasAccess);

      if (!wasGranted) {
        setStatus(copy.permissionDenied);
        return;
      }

      const [openGroups, destinationResult] = await Promise.all([
        getOpenTabGroups(copy.untitled),
        getBookmarkDestinations(defaultDestinationId),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      if (!destinationResult.defaultDestinationId) {
        setStatus(copy.importFailed);
        return;
      }

      setGroups(openGroups);
      setDestinations(destinationResult.destinations);
      setDestinationId(destinationResult.defaultDestinationId);
      setSelectedGroupIds(new Set());
      setIsDialogOpen(true);
      shouldKeepTabsAccess = true;
    } catch {
      if (isMountedRef.current) {
        setStatus(copy.unavailable);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      if (!shouldKeepTabsAccess && isMountedRef.current) {
        await releaseTemporaryAccess();
      }
    }
  }

  async function handleCloseImporter(): Promise<void> {
    if (isImporting) {
      return;
    }

    setIsDialogOpen(false);
    await releaseTemporaryAccess();
  }

  function handleDialogOpenChange(nextIsOpen: boolean): void {
    if (!nextIsOpen && !isImporting) {
      void handleCloseImporter();
    }
  }

  function handleGroupToggle(groupId: number, isChecked: boolean): void {
    setSelectedGroupIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isChecked) {
        nextIds.add(groupId);
      } else {
        nextIds.delete(groupId);
      }

      return nextIds;
    });
  }

  async function handleImport(): Promise<void> {
    if (selectedGroupIds.size === 0) {
      setStatus(copy.selectedRequired);
      return;
    }

    setIsImporting(true);
    setStatus(null);

    try {
      const importResult = await importOpenTabGroups({
        destinationId,
        groupIds: groups
          .filter(({ id }) => selectedGroupIds.has(id))
          .map(({ id }) => id),
        untitledTitle: copy.untitled,
      });

      if (isMountedRef.current) {
        setResult(importResult);
      }

      if (importResult.importedCount > 0 && onBookmarksImported) {
        try {
          await onBookmarksImported();
        } catch {
          if (isMountedRef.current) {
            setStatus(copy.refreshFailed);
          }
        }
      }
    } catch {
      if (isMountedRef.current) {
        setStatus(copy.importFailed);
      }
    } finally {
      if (isMountedRef.current) {
        setIsImporting(false);
      }
      await releaseTemporaryAccess();
    }
  }

  async function handleDisconnect(): Promise<void> {
    setStatus(null);
    await releaseTemporaryAccess();
    const wasDisconnected = await disconnectTabGroupsAccess();

    if (!isMountedRef.current) {
      return;
    }

    setIsConnected(!wasDisconnected);

    if (!wasDisconnected) {
      setStatus(copy.disconnectFailed);
    }
  }

  return {
    destinations,
    destinationId,
    groups,
    handleCloseImporter,
    handleDialogOpenChange,
    handleDisconnect,
    handleGroupToggle,
    handleImport,
    handleOpenImporter,
    hasReleaseFailure,
    isConnected,
    isDialogOpen,
    isImporting,
    isLoading,
    releaseTemporaryAccess,
    result,
    selectedGroupIds,
    setDestinationId,
    status,
  };
}
