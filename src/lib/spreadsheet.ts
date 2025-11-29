import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { Writable } from 'stream';

// Type definitions


export type DiscographyItem = {
    title: string;
    type: string;
    description: string;
    url: string;
    imageUrl: string | null;
};

export type DiscographyData = {
    [year: string]: DiscographyItem[];
};

// Environment variables for configuration
// Environment variables for configuration
const SPREADSHEET_PUB_ID = process.env.NEXT_PUBLIC_SPREADSHEET_ID || '';
const CSV_URL = process.env.NEXT_PUBLIC_CSV_URL || '';

const DISCOGRAPHY_GID = process.env.NEXT_PUBLIC_DISCOGRAPHY_GID || '0';

function getCsvUrl(gid: string): string {
    // 1. If full CSV URL is provided (and it matches the GID if possible, though usually one URL per sheet)
    // For simplicity, if NEXT_PUBLIC_CSV_URL is provided, we use it for the main discography sheet.
    // But we have two sheets (works and discography).
    // Let's assume the user provides the ID or the base URL.

    // Actually, let's try to be smart about the ID.
    if (SPREADSHEET_PUB_ID.startsWith('http')) {
        return SPREADSHEET_PUB_ID;
    }

    // If it looks like a Published ID (starts with 2PACX)
    if (SPREADSHEET_PUB_ID.startsWith('2PACX')) {
        return `https://docs.google.com/spreadsheets/d/e/${SPREADSHEET_PUB_ID}/pub?gid=${gid}&single=true&output=csv`;
    }

    // Otherwise assume it's a standard Sheet ID
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_PUB_ID}/export?format=csv&gid=${gid}`;
}


const DISCOGRAPHY_CSV_URL = getCsvUrl(DISCOGRAPHY_GID);

/**
 * Fetches and parses a public Google Sheet CSV from a given URL using Papaparse.
 */
async function fetchAndParseCsv<T>(url: string): Promise<T[]> {
    if (!SPREADSHEET_PUB_ID && !CSV_URL) {
        throw new Error('NEXT_PUBLIC_SPREADSHEET_ID is not set. Build cannot proceed.');
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse<T>(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error: Error) => {
                    reject(error);
                },
            });
        });

    } catch (error) {
        console.error(`Error fetching or parsing CSV from ${url}:`, error);
        return [];
    }
}



// Fetches and parses the 'discography' sheet
export const getDiscography = async (): Promise<DiscographyData> => {
    type DiscographyRow = DiscographyItem & { year: string };
    const items = await fetchAndParseCsv<DiscographyRow>(DISCOGRAPHY_CSV_URL);

    // The directory where images will be saved
    // Note: In Next.js static export, we should write to 'public' so they are copied to 'out'
    const imageDir = path.join(process.cwd(), 'public', 'img', 'googledrive');

    // Ensure directory exists
    try {
        await fs.mkdir(imageDir, { recursive: true });
    } catch (e) {
        // Ignore if exists
    }

    // --- Google Drive API Setup ---
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    let drive: drive_v3.Drive | null = null;

    if (credentialsJson) {
        try {
            const auth = new GoogleAuth({
                credentials: JSON.parse(credentialsJson),
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            drive = google.drive({ version: 'v3', auth });
        } catch (error) {
            console.warn('Could not initialize Google Drive API. Skipping image downloads.', error);
        }
    } else {
        console.warn('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. Skipping Google Drive image downloads.');
    }

    const processedItems = await Promise.all(items.map(async (item) => {
        // Only process if the API client is available and the URL is a Google Drive link
        if (drive && item.imageUrl && item.imageUrl.startsWith('https://drive.google.com/')) {
            try {
                // Extract file ID from the URL
                const fileIdMatch = item.imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
                if (!fileIdMatch) throw new Error('Could not parse file ID from URL');
                const fileId = fileIdMatch[1];

                // Get file metadata to determine the extension
                const { data: fileMetadata } = await drive.files.get({ fileId, fields: 'mimeType' });
                const mimeType = fileMetadata.mimeType;
                const extensionMap: { [key: string]: string } = {
                    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
                };
                const extension = mimeType ? extensionMap[mimeType] : '.jpg';

                // Download the file content
                const { data: fileStream } = await drive.files.get(
                    { fileId, alt: 'media' },
                    { responseType: 'stream' }
                );

                // Convert stream to buffer
                const chunks: Buffer[] = [];
                const buffer = await new Promise<Buffer>((resolve, reject) => {
                    const writable = new Writable({
                        write(chunk, encoding, callback) {
                            chunks.push(Buffer.from(chunk));
                            callback();
                        },
                    });
                    writable.on('finish', () => resolve(Buffer.concat(chunks)));
                    writable.on('error', reject);
                    fileStream.pipe(writable);
                });

                // Sanitize title for filename
                const sanitizedTitle = item.title
                    .replace(/\s+/g, '_')
                    .replace(/[\\/:*?"<>|()#]/g, '');
                const filename = `${item.year}-${sanitizedTitle}-${fileId}${extension}`;
                const localPath = path.join(imageDir, filename);

                await fs.writeFile(localPath, buffer);
                item.imageUrl = `/img/googledrive/${filename}`;

            } catch (error) {
                console.error(`Failed to download image for "${item.title}" (URL: ${item.imageUrl}):`, error);
                // Keep original URL if download fails
            }
        }
        return item;
    }));

    const discography: DiscographyData = {};
    processedItems.forEach(item => {
        if (item.year && item.title) {
            const yearStr = String(item.year);
            if (!discography[yearStr]) {
                discography[yearStr] = [];
            }
            discography[yearStr].push({
                title: item.title,
                type: item.type,
                description: item.description,
                url: item.url,
                imageUrl: item.imageUrl || null,
            });
        }
    });

    return discography;
};
