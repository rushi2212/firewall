// scoreCalculator.js
export const calculateThreatScore = (models) => {
  // Example: weighted average of multiple ML model scores
  const weights = { payload: 0.4, bot: 0.2, ddos: 0.2, behavior: 0.2 };

  const total =
    (models.payload || 0) * weights.payload +
    (models.bot || 0) * weights.bot +
    (models.ddos || 0) * weights.ddos +
    (models.behavior || 0) * weights.behavior;

  return Math.round(total * 100) / 100;
};
