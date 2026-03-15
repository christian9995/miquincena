/**
 * Google Drive API Wrapper
 * Handles all interactions with Google Drive for data storage
 */

const FOLDER_NAME = 'miquincena-data';
const FILE_NAME = 'data.json';
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/userinfo.email',
];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface AppState {
  version: string;
  timestamp: string;
  data: {
    transactions: any[];
    budgets: Record<string, any>;
    seedDate: string;
  };
  metadata: {
    lastSync: string;
    appVersion: string;
    deviceId: string;
  };
}

let gapi: any = null;
let gapiLoaded = false;

/**
 * Initialize Google API client
 */
export async function initializeGoogleApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gapiLoaded && gapi) {
      resolve();
      return;
    }

    // Load Google API client library
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          gapi = window.gapi;
          gapiLoaded = true;
          console.log('[v0] Google API initialized');
          resolve();
        } catch (err) {
          console.error('[v0] Failed to initialize Google API:', err);
          reject(err);
        }
      });
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google API script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Ensure appDataFolder exists and has proper permissions
 */
export async function ensureAppFolder(accessToken: string): Promise<string> {
  try {
    // Query for existing folder
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27miquincena-data%27&fields=files(id)',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      console.log('[v0] Found existing appDataFolder');
      return data.files[0].id;
    }

    // Create folder if it doesn't exist
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['appDataFolder'],
      }),
    });

    const createData = await createResponse.json();
    console.log('[v0] Created new appDataFolder:', createData.id);
    return createData.id;
  } catch (err) {
    console.error('[v0] Error ensuring app folder:', err);
    throw err;
  }
}

/**
 * Save data to Google Drive
 */
export async function saveToGoogleDrive(accessToken: string, appState: AppState): Promise<void> {
  try {
    // First ensure folder exists
    const folderId = await ensureAppFolder(accessToken);

    // Check if file already exists
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27${FILE_NAME}%27&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const listData = await listResponse.json();
    const fileId = listData.files?.[0]?.id;

    const fileContent = JSON.stringify(appState, null, 2);

    if (fileId) {
      // Update existing file
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      });

      console.log('[v0] Updated data.json on Google Drive');
    } else {
      // Create new file
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&spaces=appDataFolder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: createMultipartBody({
          name: FILE_NAME,
          mimeType: 'application/json',
          parents: [folderId],
        }, fileContent),
      });

      console.log('[v0] Created new data.json on Google Drive');
    }
  } catch (err) {
    console.error('[v0] Error saving to Google Drive:', err);
    throw err;
  }
}

/**
 * Load data from Google Drive
 */
export async function loadFromGoogleDrive(accessToken: string): Promise<AppState | null> {
  try {
    // Find the data.json file
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27${FILE_NAME}%27&fields=files(id,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const listData = await listResponse.json();

    if (!listData.files || listData.files.length === 0) {
      console.log('[v0] No data.json found on Google Drive');
      return null;
    }

    const fileId = listData.files[0].id;

    // Download file content
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to download file: ${contentResponse.statusText}`);
    }

    const appState = await contentResponse.json();
    console.log('[v0] Loaded data.json from Google Drive');
    return appState;
  } catch (err) {
    console.error('[v0] Error loading from Google Drive:', err);
    throw err;
  }
}

/**
 * Get last modified timestamp of remote data
 */
export async function getLastModified(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name=%27${FILE_NAME}%27&fields=files(modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].modifiedTime;
    }

    return null;
  } catch (err) {
    console.error('[v0] Error getting last modified:', err);
    return null;
  }
}

/**
 * Helper function to create multipart form data for Drive API
 */
function createMultipartBody(metadata: Record<string, any>, content: string): FormData {
  const formData = new FormData();
  
  const blob1 = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  formData.append('metadata', blob1);
  
  const blob2 = new Blob([content], { type: 'application/json' });
  formData.append('file', blob2);
  
  return formData;
}
