import { getPolicyForTenant, setPolicyForTenant, validatePolicyInput } from "../utils/policyStore.js";

export const getPolicy = async (req, res) => {
  const tenantId = req.tenantId || "default";
  const policy = await getPolicyForTenant(tenantId);
  res.json({ tenantId, policy });
};

export const updatePolicy = async (req, res) => {
  const tenantId = req.tenantId || "default";
  const { errors, normalized } = validatePolicyInput(req.body || {});
  if (errors.length) {
    return res.status(400).json({ error: errors.join("; ") });
  }

  const next = await setPolicyForTenant(tenantId, normalized);
  res.json({ tenantId, policy: next });
};
