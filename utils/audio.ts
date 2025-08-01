import { AudioPlayer } from 'expo-audio';

export const playSound = async (
  type: 'start' | 'beep',
  startSound: AudioPlayer,
  beepSound: AudioPlayer
): Promise<string | null> => {
  try {
    if (type === 'start') {
      if (beepSound.playing) await beepSound.pause();
      await beepSound.seekTo(0);
      await startSound.seekTo(0);
      await startSound.play();
    } else {
      await beepSound.seekTo(0);
      await beepSound.play();
    }
    return null;
  } catch (error) {
    console.error('❌ Error al reproducir sonido:', error);
    return 'No se pudo reproducir el sonido. Revisá tu dispositivo.';
  }
};

export const stopBeep = async (beepSound: AudioPlayer): Promise<string | null> => {
  try {
    if (beepSound.playing) {
      await beepSound.pause();
      await beepSound.seekTo(0);
    }
    return null;
  } catch (error) {
    console.error('❌ Error al detener sonido de beep:', error);
    return 'No se pudo detener el sonido. Revisá tu dispositivo.';
  }
};