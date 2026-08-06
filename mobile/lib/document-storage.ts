import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';

import { supabase } from '@/lib/supabase';

const BUCKET = 'client-documents';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

function sanitizeFilename(filename: string) {
  const lastSegment = filename.split(/[\\/]/).pop()?.trim() ?? '';
  const cleaned = lastSegment
    .replace(/[\u0000-\u001f<>:"|?*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 160)
    .trim() || 'document';
}

function resolveMimeType(filename: string, supplied: string | null | undefined) {
  if (supplied && ALLOWED_TYPES.includes(supplied.toLowerCase())) return supplied.toLowerCase();
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return null;
}

export async function openPrivateDocument(storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Не удалось создать безопасную ссылку на документ.');
  await Linking.openURL(data.signedUrl);
}

export async function pickAndUploadDocument(input: {
  profileId: string;
  caseId: string;
}) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return { status: 'cancelled' as const };

  const asset = result.assets[0];
  if (!asset) throw new Error('Файл не выбран.');
  if (!asset.name?.trim()) throw new Error('У выбранного файла нет названия.');
  if (!asset.size || asset.size <= 0) throw new Error('Выбран пустой файл.');
  if (asset.size > MAX_BYTES) throw new Error('Файл должен быть не больше 25 МБ.');

  const mimeType = resolveMimeType(asset.name, asset.mimeType);
  if (!mimeType) throw new Error('Разрешены только PDF, PNG, JPG, JPEG и WEBP.');

  const documentId = Crypto.randomUUID();
  const safeFilename = sanitizeFilename(asset.name);
  const storagePath = `${input.profileId}/${input.caseId}/${documentId}/${safeFilename}`;

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('Не удалось прочитать выбранный файл.');
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: metadataError } = await supabase.from('uploaded_documents').insert({
    id: documentId,
    profile_id: input.profileId,
    case_id: input.caseId,
    document_type: 'other',
    status: 'uploaded',
    document_status: 'uploaded',
    storage_path: storagePath,
    original_filename: asset.name,
    metadata: {
      storage_bucket: BUCKET,
      mime_type: mimeType,
      file_size: asset.size,
      uploaded_via: 'mobile_app',
      storage_path_version: 'user_case_document_filename_v1',
    },
  });

  if (metadataError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw metadataError;
  }

  return { status: 'uploaded' as const, documentId };
}
