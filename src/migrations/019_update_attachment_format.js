exports.up = async function(knex) {
  // Get all class updates with attachments
  const updates = await knex('class_updates')
    .whereNotNull('attachments')
    .whereRaw("attachments::text != '[]'")
    .whereRaw("attachments::text != '\"\"'")
    .whereRaw("attachments::text != ''")
    .select('id', 'attachments');

  console.log(`Found ${updates.length} class updates with attachments to migrate`);

  for (const update of updates) {
    try {
      let attachments = [];
      
      // Parse existing attachments
      if (typeof update.attachments === 'string') {
        attachments = JSON.parse(update.attachments);
      } else if (Array.isArray(update.attachments)) {
        attachments = update.attachments;
      }

      if (!Array.isArray(attachments) || attachments.length === 0) {
        continue;
      }

      // Convert old format to new format
      const migratedAttachments = attachments.map((att, index) => {
        // If already in new format, skip
        if (att.url && att.key && att.sizeFormatted) {
          return att;
        }

        // Convert old format to new format
        const fileName = att.fileName || att.filename || `attachment_${index}`;
        const originalName = att.originalName || att.fileName || fileName;
        const mimeType = att.fileType || att.mimeType || 'application/octet-stream';
        const size = att.fileSize || att.size || 0;
        const fileUrl = att.fileUrl || att.url || '';

        // Generate new S3-style key from old URL if possible
        let key = '';
        let url = '';
        
        if (fileUrl.startsWith('/uploads/')) {
          // Old local file path - convert to S3 style
          const filename = fileUrl.replace('/uploads/', '');
          const now = new Date();
          key = `class-updates/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
          url = `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001'}/api/uploads/serve/${key}`;
        } else if (fileUrl.includes('/api/uploads/serve/')) {
          // Already in new format
          url = fileUrl;
          key = fileUrl.split('/api/uploads/serve/')[1] || '';
        } else {
          // Generate new key for unknown format
          const now = new Date();
          key = `class-updates/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${fileName}`;
          url = `${process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001'}/api/uploads/serve/${key}`;
        }

        // Determine file type categories
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');
        const isDocument = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ].includes(mimeType);

        // Format file size
        const formatFileSize = (bytes) => {
          if (bytes === 0) return '0 B';
          const sizes = ['B', 'KB', 'MB', 'GB'];
          let i = 0;
          let size = bytes;
          while (size >= 1024 && i < sizes.length - 1) {
            size /= 1024;
            i++;
          }
          return `${size.toFixed(size < 10 ? 1 : 0)} ${sizes[i]}`;
        };

        return {
          id: att.id || `att_${Date.now()}_${index}`,
          fileName,
          originalName,
          mimeType,
          size: parseInt(size) || 0,
          url,
          key,
          fileType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isDocument ? 'document' : 'other',
          isImage,
          isVideo,
          isAudio,
          isDocument,
          sizeFormatted: formatFileSize(parseInt(size) || 0),
          uploadedBy: att.uploadedBy || update.author_id || '',
          uploadedAt: att.uploadedAt || att.created_at || new Date().toISOString(),
          metadata: att.metadata || null,
        };
      });

      // Update the database with migrated attachments
      await knex('class_updates')
        .where('id', update.id)
        .update({
          attachments: JSON.stringify(migratedAttachments),
        });

      console.log(`Migrated ${migratedAttachments.length} attachments for update ${update.id}`);
    } catch (error) {
      console.error(`Error migrating attachments for update ${update.id}:`, error);
      // Continue with other updates
    }
  }

  console.log('Attachment format migration completed');
};

exports.down = function(knex) {
  // This migration is not reversible as we're converting data formats
  console.log('Attachment format migration is not reversible');
  return Promise.resolve();
}; 