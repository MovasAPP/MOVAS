const { withSettingsGradle } = require('@expo/config-plugins');

module.exports = function withSafeGradleProjectName(config) {
  return withSettingsGradle(config, (config) => {
    let settings = config.modResults.contents;
    const rootProjectName = /^\s*rootProject\.name\s*=.*$/m;

    if (!rootProjectName.test(settings)) {
      throw new Error('Não foi possível localizar rootProject.name no settings.gradle.');
    }

    settings = settings.replace(rootProjectName, "rootProject.name = 'movas'");

    const uniqueSettingsLines = [];
    const singletonLines = new Set([
      'expoAutolinking.useExpoVersionCatalog()',
      "include ':app'",
      'includeBuild(expoAutolinking.reactNativeGradlePlugin)',
    ]);
    const seenSettingsLines = new Set();

    for (const line of settings.split('\n')) {
      const trimmed = line.trim();
      if (singletonLines.has(trimmed)) {
        if (seenSettingsLines.has(trimmed)) continue;
        seenSettingsLines.add(trimmed);
      }
      uniqueSettingsLines.push(line);
    }

    config.modResults.contents = uniqueSettingsLines.join('\n');
    return config;
  });
};
