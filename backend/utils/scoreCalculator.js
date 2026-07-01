// scoreCalculator.js
export const calculateThreatScore = (models) => {
  const weights = {
    payload: 0.35,
    xss: 0.2,
    bot: 0.15,
    ddos: 0.1,
    behavior: 0.1,
    rules: 0.1,
  };

  const weightedScore =
    (models.rules || 0) * weights.rules +
    (models.payload || 0) * weights.payload +
    (models.xss || 0) * weights.xss +
    (models.bot || 0) * weights.bot +
    (models.ddos || 0) * weights.ddos +
    (models.behavior || 0) * weights.behavior;

  const rulesScore = Number(models.rules || 0);
  const total = rulesScore >= 0.8 ? Math.max(weightedScore, rulesScore) : weightedScore;

  return Math.round(total * 100) / 100;
};
