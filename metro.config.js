const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Map jspdf to its ES build to avoid Metro AST crash on require(["html2canvas"])
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jspdf') {
    return {
      filePath: require.resolve('jspdf/dist/jspdf.es.min.js'),
      type: 'sourceFile',
    };
  }
  
  // Optionally, you can also completely stub html2canvas if it's still being required:
  if (moduleName === 'html2canvas') {
    return {
      type: 'empty'
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
