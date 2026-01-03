/** @type {import('next').NextConfig} */
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

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
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { isServer, webpack }) => {
    config.infrastructureLogging = {
      level: 'error',
    };
    config.resolve = config.resolve || {};
    config.resolve.symlinks = false;

    // Add path aliases for webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    // Ignore MongoDB's optional dependencies for ALL builds (server and client)
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(kerberos|@mongodb-js\/zstd|@aws-sdk\/credential-providers|gcp-metadata|snappy|socks|aws4|mongodb-client-encryption)$/,
      })
    );
    
    if (!isServer) {
      // For client-side: replace mongodb with empty module
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^mongodb$/,
          path.resolve(__dirname, 'lib/utils/empty.js')
        )
      );
      
      // Fallback for Node.js built-ins on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        timers: false,
        'timers/promises': false,
        stream: false,
        crypto: false,
        http: false,
        https: false,
        os: false,
        path: false,
        zlib: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig
