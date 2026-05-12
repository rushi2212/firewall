// scoreCalculator.js
export const calculateThreatScore = (models) => {
  const weights = {
    rules: 0.35,
    payload: 0.25,
    xss: 0.15,
    bot: 0.1,
    ddos: 0.1,
    behavior: 0.05,
  };

  const total =
    (models.rules || 0) * weights.rules +
    (models.payload || 0) * weights.payload +
    (models.xss || 0) * weights.xss +
    (models.bot || 0) * weights.bot +
    (models.ddos || 0) * weights.ddos +
    (models.behavior || 0) * weights.behavior;

  return Math.round(total * 100) / 100;
};
