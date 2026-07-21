const csvParser = require("csv-parser");
const xlsx = require("xlsx");
const stream = require("stream");
const fs = require("fs");

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
  let ageIdx = -1;
  let dobIdx = -1;
  let zipcodeIdx = -1;
  let jornayaLeadIdIdx = -1;
  let stateIdx = -1;
  let callerIdIdx = -1;
  let durationIdx = -1;
  let callDateIdx = -1;

  const isPhoneHeader = (v) => {
    // Explicitly ignore any source number / src_number column headers
    if (v.includes("src") || v.includes("source") || v.includes("code")) {
      return false;
    }
    // Strong exact matches for phone-number columns
    if (
      v === "phone" ||
      v === "phone_number" ||
      v === "phone_num" ||
      v === "phone_no" ||
      v === "phone_nu" ||
      v === "number" ||
      v === "contact" ||
      v === "customertelephonenumber" ||
      v === "telephonenumber" ||
      v === "telephone" ||
      v === "telephone_number" ||
      v === "mobile" ||
      v === "mobile_number" ||
      v === "cell" ||
      v === "cell_number"
    ) {
      return true;
    }
    // Generic includes "phone" / "telephone" / "mobile" but avoid mixed headers like "phone_nu_status"
    if (
      (v.includes("phone") ||
        v.includes("telephone") ||
        v.includes("mobile")) &&
      !v.includes("status")
    ) {
      return true;
    }
    // Includes "number" but not other ambiguous words
    if (
      v.includes("number") &&
      !v.includes("status") &&
      !v.includes("name") &&
      !v.includes("policy") &&
      !v.includes("zip")
    ) {
      return true;
    }
    return false;
  };

  const isEmailHeader = (v) => {
    return (
      v.includes("email") ||
      v === "customeremailaddress" ||
      v === "emailaddress"
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

  const isAgeHeader = (v) => {
    return v === "age" || v === "customerage" || v === "insuredage";
  };

  const isZipcodeHeader = (v) => v === "zipcode" || v === "zip" || v === "zip_code" || v === "postal_code";
  const isJornayaLeadIdHeader = (v) => v === "jornaya lead id" || v === "jornayaleadid" || v === "jornaya_lead_id" || v.includes("jornaya");
  const isStateHeader = (v) => v === "state" || v === "province";
  const isCallerIdHeader = (v) => v === "caller id" || v === "callerid" || v === "caller_id";
  const isDurationHeader = (v) => v === "duration" || v === "call_duration" || v === "length_in_sec" || v === "length_in_seconds";
  const isCallDateHeader = (v) => v === "call_date" || v === "calldate" || v === "call date";

  const isDobHeader = (v) => {
    return (
      v === "dob" ||
      v === "d.o.b" ||
      v === "date_of_birth" ||
      v === "dateofbirth" ||
      v === "birth_date" ||
      v === "birthdate" ||
      v === "birth" ||
      v === "birthday" ||
      v.includes("date of birth") ||
      v.includes("birth date") ||
      v.includes("birth_date") ||
      v.includes("birthdate")
    );
  };

  const isNameHeader = (v) => {
    // Explicit full-name columns
    if (
      v === "name" ||
      v === "full_name" ||
      v === "customername" ||
      v === "insuredname" ||
      v === "clientname"
    )
      return true;
    // Contains "name" but EXCLUDE phone-related columns like "customertelephonenumber"
    if (
      v.includes("name") &&
      !v.includes("phone") &&
      !v.includes("telephone") &&
      !v.includes("mobile") &&
      !v.includes("number") &&
      !v.includes("file") &&
      !v.includes("campaign")
    )
      return true;
    return false;
  };

  const isFirstNameHeader = (v) =>
    v === "first_name" ||
    v === "firstname" ||
    v === "first" ||
    v === "fname" ||
    v === "customerfirstname" ||
    v === "insuredfirstname";

  const isMiddleNameHeader = (v) =>
    v === "middle_initial" ||
    v === "middle" ||
    v === "mi" ||
    v === "middle_name" ||
    v === "customermiddlename" ||
    v === "customermiddleinitial";

  const isLastNameHeader = (v) =>
    v === "last_name" ||
    v === "lastname" ||
    v === "last" ||
    v === "lname" ||
    v === "customerlastname" ||
    v === "insuredlastname";

  rowLower.forEach((v, i) => {
    // IMPORTANT: Check phone FIRST to prevent headers like "customertelephonenumber"
    // from being incorrectly matched as a name column (it contains the word "name").
    if (isPhoneHeader(v) && phoneIdx === -1) {
      phoneIdx = i;
      return;
    }

    if (isEmailHeader(v) && emailIdx === -1) {
      emailIdx = i;
      return;
    }

    if (isFirstNameHeader(v) && firstNameIdx === -1) {
      firstNameIdx = i;
      return;
    }

    if (isMiddleNameHeader(v) && middleIdx === -1) {
      middleIdx = i;
      return;
    }

    if (isLastNameHeader(v) && lastNameIdx === -1) {
      lastNameIdx = i;
      return;
    }

    if (isNameHeader(v) && nameIdx === -1) {
      nameIdx = i;
      return;
    }

    if (isDispositionHeader(v) && dispIdx === -1) {
      dispIdx = i;
      return;
    }

    if (isAgeHeader(v) && ageIdx === -1) {
      ageIdx = i;
      return;
    }

    if (isDobHeader(v) && dobIdx === -1) {
      dobIdx = i;
    }
    if (isZipcodeHeader(v) && zipcodeIdx === -1) zipcodeIdx = i;
    if (isJornayaLeadIdHeader(v) && jornayaLeadIdIdx === -1) jornayaLeadIdIdx = i;
    if (isStateHeader(v) && stateIdx === -1) stateIdx = i;
    if (isCallerIdHeader(v) && callerIdIdx === -1) callerIdIdx = i;
    if (isDurationHeader(v) && durationIdx === -1) durationIdx = i;
    if (isCallDateHeader(v) && callDateIdx === -1) callDateIdx = i;
  });

  return {
    phoneIdx,
    nameIdx,
    firstNameIdx,
    middleIdx,
    lastNameIdx,
    emailIdx,
    dispIdx,
    ageIdx,
    dobIdx,
    zipcodeIdx,
    jornayaLeadIdIdx,
    stateIdx,
    callerIdIdx,
    durationIdx,
    callDateIdx,
  };
};

const detectSeparator = (buffer) => {
  const content = buffer.toString("utf8", 0, 8192); // Read more content
  const lines = content
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 20);
  if (lines.length === 0) return ",";

  const separators = [",", "\t", "|", ";"];
  const totalCounts = { ",": 0, "\t": 0, "|": 0, ";": 0 };

  lines.forEach((line) => {
    separators.forEach((sep) => {
      const count = line.split(sep).length - 1;
      totalCounts[sep] += count;
    });
  });

  let bestSep = ",";
  let maxCount = 0;
  for (const sep in totalCounts) {
    if (totalCounts[sep] > maxCount) {
      maxCount = totalCounts[sep];
      bestSep = sep;
    }
  }

  return maxCount > 0 ? bestSep : ",";
};

const calculateAgeFromDob = (dobVal) => {
  if (dobVal === null || dobVal === undefined || dobVal === "") return null;

  let birthDate = null;

  if (dobVal instanceof Date) {
    birthDate = dobVal;
  }
  else if (typeof dobVal === "number") {
    if (dobVal > 1900 && dobVal < 2100) {
      const currentYear = new Date().getFullYear();
      return Math.max(0, currentYear - dobVal);
    } else if (dobVal > 10000 && dobVal < 100000) {
      birthDate = new Date((dobVal - 25569) * 86400 * 1000);
    }
  }
  else if (typeof dobVal === "string") {
    const clean = dobVal.trim();
    if (!clean) return null;

    const parsed = Date.parse(clean);
    if (!isNaN(parsed)) {
      birthDate = new Date(parsed);
    } else {
      const parts = clean.split(/[-/\.]/);
      if (parts.length === 3) {
        let month, day, year;
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          month = parseInt(parts[0], 10) - 1;
          day = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);

          if (year < 100) {
            year += year > 30 ? 1900 : 2000;
          }
        }

        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const testDate = new Date(year, month, day);
          if (!isNaN(testDate.getTime())) {
            birthDate = testDate;
          }
        }
      } else if (clean.length === 4 && !isNaN(parseInt(clean))) {
        const yr = parseInt(clean, 10);
        if (yr > 1900 && yr < 2100) {
          const currentYear = new Date().getFullYear();
          return Math.max(0, currentYear - yr);
        }
      }
    }
  }

  if (birthDate && !isNaN(birthDate.getTime())) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age >= 0 && age <= 120) {
      return age;
    }
  }

  return null;
};

// filePath: disk par file ka path (preferred — less memory)
// buffer:   RAM buffer (fallback for backward compat)
const processFileBuffer = async (bufferOrPath, mimetype, originalname) => {
  const isPath = typeof bufferOrPath === "string";
  const records = [];
  let isHeaderDetected = false;
  let headerIndices = null;
  const excludedIndices = new Set();

  const parseDataRow = (values) => {
    if (!values || values.length === 0) return null;

    let phone = "",
      name = "",
      email = "",
      disposition = "",
      age = null,
      dob = null,
      zipcode = null,
      jornaya_lead_id = null,
      state = null,
      caller_id = null,
      duration = null,
      call_date = null;

    if (isHeaderDetected && headerIndices) {
      if (headerIndices.phoneIdx !== -1)
        phone = String(values[headerIndices.phoneIdx] || "").trim();

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
      }

      if (headerIndices.emailIdx !== -1)
        email = String(values[headerIndices.emailIdx] || "").trim();
      if (headerIndices.dispIdx !== -1)
        disposition = String(values[headerIndices.dispIdx] || "").trim();
      if (headerIndices.ageIdx !== -1) {
        const rawAge = String(values[headerIndices.ageIdx] || "").trim();
        const parsedAge = parseInt(rawAge);
        if (!isNaN(parsedAge)) age = parsedAge;
      }

      if (headerIndices.dobIdx !== -1) {
        const rawDob = values[headerIndices.dobIdx];
        const calculatedAge = calculateAgeFromDob(rawDob);
        if (calculatedAge !== null) {
          age = calculatedAge;
        }
        if (typeof rawDob === 'number' && rawDob > 10000 && rawDob < 100000) {
           const d = new Date((rawDob - 25569) * 86400 * 1000);
           dob = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        } else {
           dob = String(rawDob || "").trim();
        }
      }

      if (headerIndices.zipcodeIdx !== -1) zipcode = String(values[headerIndices.zipcodeIdx] || "").trim();
      if (headerIndices.jornayaLeadIdIdx !== -1) jornaya_lead_id = String(values[headerIndices.jornayaLeadIdIdx] || "").trim();
      if (headerIndices.stateIdx !== -1) state = String(values[headerIndices.stateIdx] || "").trim();
      if (headerIndices.callerIdIdx !== -1) caller_id = String(values[headerIndices.callerIdIdx] || "").trim();
      if (headerIndices.durationIdx !== -1) {
         const rawDuration = values[headerIndices.durationIdx];
         if (rawDuration !== undefined && rawDuration !== "") {
            if (typeof rawDuration === 'number' && rawDuration < 1) {
               duration = Math.round(rawDuration * 86400);
            } else {
               let durStr = String(rawDuration).trim();
               if (durStr.includes(':')) {
                 const parts = durStr.split(':').map(Number);
                 if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                 else if (parts.length === 2) duration = parts[0] * 60 + parts[1];
               } else {
                 const parsedDur = parseInt(durStr, 10);
                 if (!isNaN(parsedDur)) duration = parsedDur;
               }
            }
         }
      }
      if (headerIndices.callDateIdx !== -1) call_date = String(values[headerIndices.callDateIdx] || "").trim();

      // Clean phone number initially
      let digitsOnly = phone ? phone.replace(/\D/g, "") : "";

      // Fallback for phone if missing or invalid
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        let bestFallbackIdx = -1;
        let maxFallbackScore = -1;

        for (let i = 0; i < values.length; i++) {
          if (excludedIndices.has(i)) continue; // Ignore excluded columns (like src_number) in fallback
          const val = String(values[i] || "").trim();
          const d = val.replace(/\D/g, "");
          if (d.length >= 10 && d.length <= 15) {
            let s = 0;
            if (d.length === 10) s += 20;
            if (val.includes("-") && val.includes(":")) s -= 50;
            if (s > maxFallbackScore) {
              maxFallbackScore = s;
              bestFallbackIdx = i;
            }
          }
        }
        if (bestFallbackIdx !== -1 && maxFallbackScore >= 0) {
          phone = String(values[bestFallbackIdx]);
        }
      }
    } else {
      // Intelligent per-row Guessing
      let pIdx = -1,
        eIdx = -1,
        dIdx = -1;

      let bestPhoneIdx = -1;
      let maxPhoneScore = -1;

      values.forEach((v, i) => {
        const val = String(v).trim();
        if (!val) return;
        const lower = val.toLowerCase();

        if (val.includes("@") && val.includes(".")) {
          if (eIdx === -1) eIdx = i;
          return;
        }

        if (KNOWN_DISPOSITIONS.has(lower)) {
          if (dIdx === -1) dIdx = i;
          return;
        }

        const digits = val.replace(/\D/g, "");
        if (digits.length >= 7) {
          let score = 0;
          if (digits.length === 10) score += 30;
          else if (digits.length === 11 && digits.startsWith("1")) score += 20;
          else if (digits.length >= 10 && digits.length <= 15) score += 10;

          if (val.includes("-") && val.includes(":")) score -= 100; // Date/Time
          if (val.includes(" ") && val.split(" ").length > 2) score -= 50; // Too many spaces
          if (val.length > 25) score -= 40; // Too long for a phone number field

          if (score > maxPhoneScore) {
            maxPhoneScore = score;
            bestPhoneIdx = i;
          }
        }
      });

      if (bestPhoneIdx !== -1 && maxPhoneScore >= 0) {
        pIdx = bestPhoneIdx;
      }

      const used = new Set([pIdx, eIdx, dIdx].filter((x) => x !== -1));

      if (dIdx === -1) {
        values.forEach((v, i) => {
          if (used.has(i)) return;
          const val = String(v).trim();
          if (!val) return;
          if (KNOWN_STATES.has(val.toLowerCase())) return;
          if (val.length > 1 && val.length < 50 && !val.includes("@")) {
            dIdx = i;
            used.add(i);
          }
        });
      }

      if (pIdx !== -1) phone = String(values[pIdx] || "").trim();
      if (eIdx !== -1) email = String(values[eIdx] || "").trim();
      if (dIdx !== -1) disposition = String(values[dIdx] || "").trim();
    }

    if (!phone && caller_id) phone = caller_id;

    if (phone) {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        return {
          name: name || null,
          phone: digitsOnly,
          email: email || null,
          disposition: disposition || null,
          age: age || null,
          dob: dob || null,
          zipcode: zipcode || null,
          jornaya_lead_id: jornaya_lead_id || null,
          state: state || null,
          caller_id: caller_id || null,
          duration: duration || null,
          call_date: call_date || null,
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
    let workbook;
    if (isPath) {
      workbook = xlsx.readFile(bufferOrPath); // Stream from disk directly to avoid holding massive buffer
    } else {
      workbook = xlsx.read(bufferOrPath, { type: "buffer" });
    }
    const jsonData = xlsx.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      {
        defval: "",
        header: 1,
      },
    );

    for (let i = 0; i < jsonData.length; i++) {
      if (i === 0 && jsonData[i].length > 0) {
        const rowLower = jsonData[i].map((v) => String(v).trim().toLowerCase());
        const hasHeader = rowLower.some((v) =>
          ["phone", "number", "name", "email", "disp", "status", "caller", "duration", "zip", "jornaya", "dob", "age"].some((k) =>
            v.includes(k),
          ),
        );
        if (hasHeader) {
          isHeaderDetected = true;
          headerIndices = guessIndices(rowLower);
          rowLower.forEach((v, idx) => {
            if (v.includes("src") || v.includes("source")) {
              excludedIndices.add(idx);
            }
          });
          continue;
        }
      }
      const record = parseDataRow(jsonData[i]);
      if (record) records.push(record);

      // Yield occasionally to prevent event loop blocking for very large files
      if (i % 5000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return records;
  } else {
    let bufferForDetection;
    if (isPath) {
      const fd = fs.openSync(bufferOrPath, "r");
      const tmpBuf = Buffer.alloc(8192);
      const bytesRead = fs.readSync(fd, tmpBuf, 0, 8192, 0);
      fs.closeSync(fd);
      bufferForDetection = tmpBuf.subarray(0, bytesRead);
    } else {
      bufferForDetection = bufferOrPath;
    }

    const detectedSeparator = detectSeparator(bufferForDetection);
    console.log(
      `Detected separator for ${originalname}: [${detectedSeparator}]`,
    );

    let isFirstRow = true;
    let streamToParse;

    if (isPath) {
      streamToParse = fs.createReadStream(bufferOrPath);
    } else {
      streamToParse = new stream.PassThrough();
      streamToParse.end(bufferOrPath);
    }

    const parser = streamToParse.pipe(
      csvParser({ headers: false, separator: detectedSeparator }),
    );

    for await (const row of parser) {
      const values = Object.values(row).map((v) => String(v).trim());
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;

      if (isFirstRow) {
        isFirstRow = false;
        // Stricter header check: must have multiple columns to be a valid header for CSV/TXT
        if (values.length > 0) {
          const rowLower = values.map((v) => v.toLowerCase());
          const hasHeader = rowLower.some((v) =>
            ["phone", "number", "name", "email", "disp", "status", "caller", "duration", "zip", "jornaya", "dob", "age"].some((k) =>
              v.includes(k),
            ),
          );
          if (hasHeader) {
            isHeaderDetected = true;
            headerIndices = guessIndices(rowLower);
            rowLower.forEach((v, idx) => {
              if (v.includes("src") || v.includes("source")) {
                excludedIndices.add(idx);
              }
            });
            continue;
          }
        }
      }

      const record = parseDataRow(values);
      if (record) records.push(record);

      // Yield occasionally to prevent event loop blocking
      if (records.length % 5000 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    return records;
  }
};

module.exports = { processFileBuffer };
