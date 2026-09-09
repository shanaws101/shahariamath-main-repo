import { useEffect } from "react";

const AWAY_MESSAGES = [
  "😢 আমরা তোমাকে মিস করছি!",
  "👋 হেই, ফিরে এসো!",
  "📚 ক্লাস চলছে, তুমি কোথায়?",
  "🎓 তোমার পড়াশোনা অপেক্ষা করছে!",
];

export function useTabTitle() {
  useEffect(() => {
    const originalTitle = document.title;
    let awayTitle = "";

    const pickRandom = () =>
      AWAY_MESSAGES[Math.floor(Math.random() * AWAY_MESSAGES.length)];

    const handleVisibility = () => {
      if (document.hidden) {
        awayTitle = pickRandom();
        document.title = awayTitle;
      } else {
        document.title = originalTitle;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.title = originalTitle;
    };
  }, []);
}
