import path from 'path';
import multer from 'multer';

const tmpDir = path.resolve(__dirname, '..', '..', 'tmp');

export default {
  directory: tmpDir,

  storage: multer.diskStorage({
    destination: tmpDir,
  }),
};
