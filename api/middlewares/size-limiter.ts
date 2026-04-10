import { json } from 'express';

import multer from 'multer';
export const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  },
});

export const strictJson = json({ limit: '10kb' });
export const normalJson = json({ limit: '1mb' });
export const largeJson = json({ limit: '10mb' });
