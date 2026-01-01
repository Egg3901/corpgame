/** @type {import('next').NextConfig} */
const fs = require('fs');
const fsPromises = require('fs/promises');

if (!global.__CORPGAME_READLINK_WORKAROUND__) {
  const originalReadlink = fs.readlink;
  const originalReadlinkSync = fs.readlinkSync;
  const originalPromisesReadlink = fs.promises?.readlink;
  const originalFsPromisesReadlink = fsPromises?.readlink;

  fs.readlink = function (path, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    return originalReadlink.call(fs, path, options, (err, linkString) => {
      if (err && err.code === 'EISDIR') {
        const patchedErr = Object.assign(new Error(err.message), err, {
          code: 'EINVAL',
          errno: -22,
        });
        return callback(patchedErr);
      }
      return callback(err, linkString);
    });
  };

  fs.readlinkSync = function (path, options) {
    try {
      return originalReadlinkSync.call(fs, path, options);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        const patchedErr = Object.assign(new Error(err.message), err, {
          code: 'EINVAL',
          errno: -22,
        });
        throw patchedErr;
      }
      throw err;
    }
  };

  const wrapPromiseReadlink = (originalFn) => {
    if (typeof originalFn !== 'function') return originalFn;
    return async (path, options) => {
      try {
        return await originalFn(path, options);
      } catch (err) {
        if (err && err.code === 'EISDIR') {
          const patchedErr = Object.assign(new Error(err.message), err, {
            code: 'EINVAL',
            errno: -22,
          });
          throw patchedErr;
        }
        throw err;
      }
    };
  };

  if (fs.promises && originalPromisesReadlink) {
    fs.promises.readlink = wrapPromiseReadlink(originalPromisesReadlink);
  }

  if (fsPromises && originalFsPromisesReadlink) {
    fsPromises.readlink = wrapPromiseReadlink(originalFsPromisesReadlink);
  }

  global.__CORPGAME_READLINK_WORKAROUND__ = true;
}

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.infrastructureLogging = {
      level: 'error',
    };
    config.resolve = config.resolve || {};
    config.resolve.symlinks = false;
    return config;
  },
}

module.exports = nextConfig
