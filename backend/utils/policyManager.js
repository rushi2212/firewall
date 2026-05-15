// policyManager.js
import { getPolicyForTenant } from "./policyStore.js";

export const applyPolicy = async (score, tenantId = "default") => {
  const policy = await getPolicyForTenant(tenantId);
  if (score >= policy.blockThreshold) return "block";
  if (score >= policy.alertThreshold) return "alert";
  return "allow";
};
