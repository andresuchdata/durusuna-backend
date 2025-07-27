-- Simple script to reset all notifications to unread
UPDATE notifications 
SET 
    is_read = false,
    read_at = NULL,
    updated_at = NOW(); 