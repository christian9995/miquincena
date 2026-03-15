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
    console.log('[v0] Searching for existing data file in Google Drive');
    
    // Search for existing file in appDataFolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[v0] Drive Search Error:', searchResponse.status, searchResponse.statusText, errorText);
      throw new Error(`Search failed with status ${searchResponse.status}: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      console.log('[v0] Found existing data file:', searchData.files[0].id);
      return searchData.files[0].id;
    }

    // File doesn't exist, create it with empty data
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
 * Save app state to Google Drive
 */
export async function saveAppStateToDrive(
  accessToken: string,
  appState: AppState
): Promise<void> {
  try {
    const fileId = await findOrCreateFile(accessToken);

    const content = JSON.stringify(appState);

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new Error(`Save failed: ${response.statusText}`);
    }

    console.log('[v0] App state saved to Google Drive');
  } catch (err) {
    console.error('[v0] Error saving app state to Drive:', err);
    throw err;
  }
}

/**
 * Load app state from Google Drive
 */
export async function loadAppStateFromDrive(accessToken: string): Promise<AppState | null> {
  try {
    console.log('[v0] Loading app state from Google Drive');
    
    // Search for existing file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[v0] Drive Load Search Error:', searchResponse.status, searchResponse.statusText, errorText);
      throw new Error(`Search failed with status ${searchResponse.status}: ${searchResponse.statusText}`);
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
      console.error('[v0] Drive Load Content Error:', contentResponse.status, contentResponse.statusText, errorText);
      throw new Error(`Content load failed with status ${contentResponse.status}: ${contentResponse.statusText}`);
    }

    const appState = await contentResponse.json();
    console.log('[v0] Successfully loaded app state from Google Drive');
    return appState;
  } catch (err) {
    console.error('[v0] Error loading app state from Drive:', err);
    // Return null instead of throwing to allow graceful fallback
    return null;
  }
}
        budgets: {},
        seedDate: '2026-01-02',
        timestamp: Date.now(),
      };
    }

    const fileId = searchData.files[0].id;

    // Download the file content
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!contentResponse.ok) {
      throw new Error(`Download failed: ${contentResponse.statusText}`);
    }

    const appState = await contentResponse.json() as AppState;
    console.log('[v0] App state loaded from Google Drive');
    return appState;
  } catch (err) {
    console.error('[v0] Error loading app state from Drive:', err);
    return null;
  }
}
