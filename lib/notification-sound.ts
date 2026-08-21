/**
 * Синтезированный через Web Audio чайм — тот же, что уже был отлажен
 * в системе email-уведомлений сайта. Вынесен из orders-table.tsx сюда,
 * потому что теперь нужен в двух местах (таблица + провайдер алерта) —
 * не дублирую, а переиспользую то, что уже было.
 */
export function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.14);
      gain.gain.linearRampToValueAtTime(0.55, now + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.34);
    });
  } catch {
    // Автоплей может быть заблокирован до первого взаимодействия
    // пользователя со страницей — тихо пропускаем звук.
  }
}
