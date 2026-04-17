const csvParser = require("csv-parser");
const xlsx = require("xlsx");
const stream = require("stream");

const KNOWN_STATES = new Set([
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
  "california",
  "new york",
  "texas",
  "florida",
  "north carolina",
  "pennsylvania",
  "michigan",
  "washington",
  "georgia",
  "ohio",
  "illinois",
]);

const KNOWN_DISPOSITIONS = new Set([
  "pdrop",
  "ab",
  "adc",
  "a",
  "aa",
  "raxfer",
  "np",
  "dc",
  "dnq",
  "n",
  "bn",
  "lrerr",
  "ni",
  "na",
  "lh",
  "r1",
  "bdnc",
  "callbk",
]);

// Try to intelligently map header columns to phone / name / email / disposition
// This is important for exports where a single header like "phone_nu_status"
// can accidentally be treated as both phone and status.
const guessIndices = (rowLower) => {
  let phoneIdx = -1;
  let nameIdx = -1; // legacy (e.g. "name") - we intentionally prefer first/middle/last when present
  let firstNameIdx = -1;
  let middleIdx = -1;
  let lastNameIdx = -1;
  let emailIdx = -1;
  let dispIdx = -1;

  const isPhoneHeader = (v) => {
    // Strong matches for phone-number columns
    if (
      v === "phone" ||
      v === "phone_number" ||
      v === "phone_num" ||
      v === "phone_no" ||
      v === "phone_nu" ||
      v === "number" ||
      v === "contact"
    ) {
      return true;
    }
    // Generic includes "phone" / "number" but avoid mixed headers like "phone_nu_status"
    return (
      (v.includes("phone") || v.includes("number")) && !v.includes("status")
    );
  };

  const isDispositionHeader = (v) => {
    if (v === "status" || v === "disposition" || v === "result") return true;
    // Generic "disp" match
    if (v.includes("disp")) return true;
    // If header contains "status" but not "phone", treat as disposition
    if (v.includes("status") && !v.includes("phone")) return true;
    return false;
  };

  rowLower.forEach((v, i) => {
    if (v.includes("email") && emailIdx === -1) {
      emailIdx = i;
      return;
    }

    if (
      (v === "first_name" || v === "firstname" || v === "first" || v === "fname") &&
      firstNameIdx === -1
    ) {
      firstNameIdx = i;
      return;
    }

    if (
      (v === "middle_initial" ||
        v === "middle" ||
        v === "mi" ||
        v === "middle_name") &&
      middleIdx === -1
    ) {
      middleIdx = i;
      return;
    }

    if (
      (v === "last_name" || v === "lastname" || v === "last" || v === "lname") &&
      lastNameIdx === -1
    ) {
      lastNameIdx = i;
      return;
    }

    if ((v === "name" || v === "full_name" || v.includes("name")) && nameIdx === -1) {
      nameIdx = i;
      return;
    }

    if (isPhoneHeader(v) && phoneIdx === -1) {
      phoneIdx = i;
      return;
    }

    if (isDispositionHeader(v) && dispIdx === -1) {
      dispIdx = i;
    }
  });

  return {
    phoneIdx,
    nameIdx,
    firstNameIdx,
    middleIdx,
    lastNameIdx,
    emailIdx,
    dispIdx,
  };
};

const processFileBuffer = async (buffer, mimetype, originalname) => {
  const records = [];
  let isHeaderDetected = false;
  let headerIndices = null;

  const parseDataRow = (values) => {
    if (!values || values.length === 0) return null;

    let phone = "",
      name = "",
      email = "",
      disposition = "";

    if (isHeaderDetected && headerIndices) {
      if (headerIndices.phoneIdx !== -1)
        phone = String(values[headerIndices.phoneIdx] || "").trim();

      // IMPORTANT: Only populate "name" when we have first/middle/last style columns.
      // We intentionally ignore generic "full_name" fields because they often contain
      // non-person labels (e.g. "Outbound Auto Dial").
      const first =
        headerIndices.firstNameIdx !== -1
          ? String(values[headerIndices.firstNameIdx] || "").trim()
          : "";
      const middle =
        headerIndices.middleIdx !== -1
          ? String(values[headerIndices.middleIdx] || "").trim()
          : "";
      const last =
        headerIndices.lastNameIdx !== -1
          ? String(values[headerIndices.lastNameIdx] || "").trim()
          : "";

      if (first || last || middle) {
        const parts = [first, middle, last].filter(Boolean);
        name = parts.join(" ").trim();
      } else if (headerIndices.nameIdx !== -1) {
        name = String(values[headerIndices.nameIdx] || "").trim();
      } else {
        name = "";
      }

      if (headerIndices.emailIdx !== -1)
        email = String(values[headerIndices.emailIdx] || "").trim();
      if (headerIndices.dispIdx !== -1)
        disposition = String(values[headerIndices.dispIdx] || "").trim();

      // Clean phone number initially
      let digitsOnly = phone ? phone.replace(/\D/g, "") : "";

      // Fallback for phone if missing or invalid (like scientific notation string '6.12E+09' from Excel)
      if (digitsOnly.length < 10) {
        for (let i = 0; i < values.length; i++) {
          const val = String(values[i] || "").trim();
          // Avoid dates by checking for standard US 10+ digit phone lengths
          if (
            (val.match(/\d/g) || []).length >= 10 &&
            i !== headerIndices.nameIdx &&
            i !== headerIndices.emailIdx &&
            i !== headerIndices.dispIdx
          ) {
            phone = val;
            break;
          }
        }
      }
    } else {
      // Intelligent per-row Guessing
      let pIdx = -1,
        eIdx = -1,
        dIdx = -1;

      // Pass 1: exact matching
      values.forEach((v, i) => {
        const val = String(v).trim();
        const lower = val.toLowerCase();
        if (!val) return;

        if (val.includes("@") && val.includes(".")) {
          eIdx = i;
        } else if ((val.match(/\d/g) || []).length >= 10) {
          if (pIdx === -1) pIdx = i;
        } else if (KNOWN_DISPOSITIONS.has(lower)) {
          dIdx = i;
        }
      });

      const used = new Set([pIdx, eIdx, dIdx].filter((x) => x !== -1));

      // Pass 2: fill blanks
      values.forEach((v, i) => {
        if (used.has(i)) return;
        const val = String(v).trim();
        if (!val) return;
        const lower = val.toLowerCase();

        if (KNOWN_STATES.has(lower)) {
          return; // Ignore states
        }

        // NOTE: We intentionally do NOT guess "name" without explicit first/last columns.
        // Many vendor files include labels like "Outbound Auto Dial" that would be mistaken for a name.
        if (dIdx === -1 && val.length > 1 && val.length < 50) {
          dIdx = i;
          used.add(i);
        }
      });

      if (pIdx !== -1) phone = String(values[pIdx] || "").trim();
      if (eIdx !== -1) email = String(values[eIdx] || "").trim();
      if (dIdx !== -1) disposition = String(values[dIdx] || "").trim();
    }

    if (phone) {
      // Clean phone number: remove everything except digits
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length >= 7) {
        return {
          name: name || null,
          phone: digitsOnly,
          email: email || null,
          disposition: disposition || null,
        };
      }
    }
    return null;
  };

  const isExcel =
    mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel" ||
    originalname.endsWith(".xlsx") ||
    originalname.endsWith(".xls");

  if (isExcel) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      header: 1,
    });

    for (let i = 0; i < jsonData.length; i++) {
      if (i === 0 && jsonData[i].length > 0) {
        const rowLower = jsonData[i].map((v) => String(v).trim().toLowerCase());
        const hasHeader = rowLower.some(
          (v) =>
            v.includes("phone") ||
            v.includes("number") ||
            v.includes("name") ||
            v.includes("email") ||
            v.includes("disp") ||
            v.includes("status"),
        );
        if (hasHeader) {
          isHeaderDetected = true;
          headerIndices = guessIndices(rowLower);
          continue;
        }
      }

      const record = parseDataRow(jsonData[i]);
      if (record) {
        records.push(record);
      }
    }
    return records;
  } else {
    // CSV Uploads
    return new Promise((resolve, reject) => {
      let isFirstRow = true;
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);
      bufferStream
        .pipe(csvParser({ headers: false }))
        .on("data", (row) => {
          const values = Object.values(row);
          if (values.length === 0) return;

          if (isFirstRow) {
            isFirstRow = false;
            const rowLower = values.map((v) => String(v).trim().toLowerCase());
            const hasHeader = rowLower.some(
              (v) =>
                v.includes("phone") ||
                v.includes("number") ||
                v.includes("name") ||
                v.includes("email") ||
                v.includes("disp") ||
                v.includes("status"),
            );
            if (hasHeader) {
              isHeaderDetected = true;
              headerIndices = guessIndices(rowLower);
              return;
            }
          }

          const record = parseDataRow(values);
          if (record) records.push(record);
        })
        .on("end", () => resolve(records))
        .on("error", (err) => reject(err));
    });
  }
};

module.exports = { processFileBuffer };
