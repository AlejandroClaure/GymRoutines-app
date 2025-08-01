// Configuración de Babel para el proyecto
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'], // Preset para Expo
    plugins: ['react-native-reanimated/plugin'], // Plugin necesario para animaciones
  };
};