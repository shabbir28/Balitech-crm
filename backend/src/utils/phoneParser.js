const normalizeUsDigits = (raw) => {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // Common cases
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);

  // Excel/VICIdial exports sometimes carry extra digits; last 10 is usually the real NANP number
  if (digits.length > 11) return digits.slice(-10);

  return null;
};

const parsePhone = (rawPhone) => {
  const us10 = normalizeUsDigits(rawPhone);
  if (!us10) return { phone: null, countryCode: null, areaCode: null };

  return {
    phone: us10,
    countryCode: "1",
    areaCode: us10.substring(0, 3),
  };
};

module.exports = { parsePhone, normalizeUsDigits };
