/**
 * Google Drive API Wrapper
 * Handles all interactions with Google Drive for data storage using drive.appdata scope
 */

const FILE_NAME = 'miquincena-data.json';

export interface AppState {
  transactions: any[];
  budgets: Record<string, any>;
  seedDate: string;
  timestamp: number;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

/**
 * Find or create the data file in appDataFolder
 */
async function findOrCreateFile(accessToken: string): Promise<string> {
  try {
    // Validate token format
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('[v0] Invalid token format:', typeof accessToken);
      throw new Error('Invalid or missing access token');
    }

    if (accessToken.length < 10) {
      console.error('[v0] Token appears to be invalid (too short)');
      throw new Error('Access token appears invalid');
    }

    console.log('[v0] Searching for existing data file in Google Drive');
    console.log('[v0] Token length:', accessToken.length);
    console.log('[v0] Token prefix:', accessToken.substring(0, 20) + '...');
    
    // Search for existing file in appDataFolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[v0] Search response status:', searchResponse.status, searchResponse.statusText);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[v0] Drive Search Error:', searchResponse.status, searchResponse.statusText);
      console.error('[v0] Error response body:', errorText);
      
      if (searchResponse.status === 401) {
        console.error('[v0] Authentication failed - token may be expired or invalid');
      }
      
      throw new Error(`Search failed with status ${searchResponse.status}: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      console.log('[v0] Found existing data file:', searchData.files[0].id);
      return searchData.files[0].id;
    }

    // File doesn't exist, create it with empty data
    console.log('[v0] No existing file found, creating new one');
    const initialData: AppState = {
      transactions: [],
      budgets: {},
      seedDate: '2026-01-02',
      timestamp: Date.now(),
    };

    const metadata = {
      name: FILE_NAME,
      mimeType: 'application/json',
      parents: ['appDataFolder'],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append(
      'file',
      new Blob([JSON.stringify(initialData)], { type: 'application/json' })
    );

    const createResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=appDataFolder',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[v0] Drive Create Error:', createResponse.status, createResponse.statusText, errorText);
      throw new Error(`Create failed with status ${createResponse.status}: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    console.log('[v0] Created new data file:', createData.id);
    return createData.id;
  } catch (err) {
    console.error('[v0] Error in findOrCreateFile:', err);
    throw err;
  }
}

/**
 * Get the last modified timestamp of the remote file without downloading
 * Used for Local-First sync decision making
 */
export async function getRemoteFileTimestamp(accessToken: string): Promise<string | null> {
  try {
    if (!accessToken) {
      console.log('[v0] No access token for checking remote timestamp');
      return null;
    }

    console.log('[v0] Checking remote file timestamp');
    
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id,modifiedTime)`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Detect token expiration (401)
    if (searchResponse.status === 401) {
      console.error('[v0] Token expired (401) when checking remote timestamp');
      throw new Error('TOKEN_EXPIRED');
    }

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[v0] Failed to check remote timestamp:', searchResponse.status, errorText);
      return null;
    }

    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
      const modifiedTime = searchData.files[0].modifiedTime;
      console.log('[v0] Remote file modified:', modifiedTime);
      return modifiedTime;
    }

    console.log('[v0] No remote file found');
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
      throw err; // Re-throw token expiration for handling in auth context
    }
    console.error('[v0] Error getting remote timestamp:', err);
    return null;
  }
}

/**
 * Save app state to Google Drive with Local-First validation
 */
export async function saveAppStateToDriveWithLocalFirst(
  accessToken: string,
  appState: AppState,
  remoteModifiedTime?: string
): Promise<void> {
  try {
    const { determineSyncDirection } = await import('./sync-manager');
    const syncDirection = determineSyncDirection(
      appState.timestamp,
      0,
      remoteModifiedTime
    );

    console.log('[v0] Sync direction determined:', syncDirection);

    if (syncDirection === 'skip') {
      console.log('[v0] Skipping sync - timestamps too close');
      return;
    }

    // Always save (upload local data to Drive)
    await saveAppStateToDrive(accessToken, appState);
  } catch (err) {
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
      throw err; // Re-throw for token refresh handling
    }
    console.error('[v0] Error in Local-First save:', err);
    throw err;
  }
}

/**
 * Load app state from Google Drive
 */
export async function loadAppStateFromDrive(accessToken: string): Promise<AppState | null> {
  try {
    if (!accessToken) {
      console.log('[v0] No access token available for loading from Drive');
      return null;
    }

    console.log('[v0] Loading app state from Google Drive');
    console.log('[v0] Token prefix:', accessToken.substring(0, 20) + '...');
    
    // Search for existing file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id,modifiedTime)`,
      {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[v0] Load Search response status:', searchResponse.status);

    // Detect token expiration (401)
    if (searchResponse.status === 401) {
      console.error('[v0] Token expired (401) when loading from Drive');
      throw new Error('TOKEN_EXPIRED');
    }

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[v0] Drive Load Search Error:', searchResponse.status, searchResponse.statusText);
      console.error('[v0] Error response:', errorText);
      return null;
    }

    const searchData = await searchResponse.json();

    if (!searchData.files || searchData.files.length === 0) {
      console.log('[v0] No data file found on Google Drive');
      return null;
    }

    const fileId = searchData.files[0].id;
    console.log('[v0] Found data file, loading content:', fileId);

    // Load file content
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('[v0] Drive Load Content Error:', contentResponse.status, contentResponse.statusText);
      
      // Detect token expiration (401)
      if (contentResponse.status === 401) {
        console.error('[v0] Token expired (401) when loading content from Drive');
        throw new Error('TOKEN_EXPIRED');
      }
      
      return null;
    }

    const appState = await contentResponse.json();
    console.log('[v0] Successfully loaded app state from Google Drive');
    return appState;
  } catch (err) {
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
      throw err; // Re-throw token expiration for handling in auth context
    }
    console.error('[v0] Error loading app state from Drive:', err);
    return null;
  }
}

/**
 * Save app state to Google Drive
 */
export async function saveAppStateToDrive(
  accessToken: string,
  appState: AppState
): Promise<void> {
  try {
    console.log('[v0] Saving app state to Google Drive');

    // Find or create the file
    const fileId = await findOrCreateFile(accessToken);

    // Update the file with new data
    const metadata = {
      name: FILE_NAME,
      mimeType: 'application/json',
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append(
      'file',
      new Blob([JSON.stringify(appState)], { type: 'application/json' })
    );

    const updateResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[v0] Drive Update Error:', updateResponse.status, updateResponse.statusText, errorText);
      
      // Detect token expiration (401)
      if (updateResponse.status === 401) {
        console.error('[v0] Token expired (401) when saving to Drive');
        throw new Error('TOKEN_EXPIRED');
      }
      
      throw new Error(`Update failed with status ${updateResponse.status}: ${updateResponse.statusText}`);
    }

    console.log('[v0] Successfully saved app state to Google Drive');
  } catch (err) {
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') {
      throw err; // Re-throw token expiration for handling in auth context
    }
    console.error('[v0] Error saving app state to Drive:', err);
    throw err;
  }
}
