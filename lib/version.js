const format = require('python-format')

const VersionMajor = 0          // Major version component of the current release
const VersionMinor = 0          // Minor version component of the current release
const VersionPatch = 1          // Patch version component of the current release
const VersionMeta  = "unstable" // Version metadata to append to the version string

/**
 * version string
 */
function version() {
  let version = format("{}.{}.{}", VersionMajor, VersionMinor, VersionPatch)
  if(VersionMeta != '') {
    version += "." + VersionMeta
  }
  return version
}

module.exports = version