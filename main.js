const fs = require("fs");

// ============================================================const fs = require("fs");

function timeToSeconds(timeStr) {
    const parts = timeStr.trim().split(" ");
    const timePart = parts[0];
    const period = parts[1].toLowerCase();

    let [hours, minutes, seconds] = timePart.split(":").map(Number);

    if (period === "am" && hours === 12) {
        hours = 0;
    } else if (period === "pm" && hours !== 12) {
        hours += 12;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function durationToSeconds(durationStr) {
    const [hours, minutes, seconds] = durationStr.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);

    const duration = endSeconds - startSeconds;

    return secondsToTime(duration);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);

    const workStart = 8 * 3600;
    const workEnd = 22 * 3600;

    let idle = 0;

    if (startSeconds < workStart) {
        idle += workStart - startSeconds;
    }

    if (endSeconds > workEnd) {
        idle += endSeconds - workEnd;
    }

    return secondsToTime(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const shiftSeconds = durationToSeconds(shiftDuration);
    const idleSeconds = durationToSeconds(idleTime);

    const active = shiftSeconds - idleSeconds;

    return secondsToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const activeSeconds = durationToSeconds(activeTime);

    const specialStart = "2025-04-10";
    const specialEnd = "2025-04-30";

    let requiredSeconds;

    if (date >= specialStart && date <= specialEnd) {
        requiredSeconds = 6 * 3600;
    } else {
        requiredSeconds = 8 * 3600 + 24 * 60;
    }

    return activeSeconds >= requiredSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const data = fs.readFileSync(textFile, "utf8").trim();
    const lines = data.split("\n");

    const driverID = shiftObj.driverID;
    const date = shiftObj.date;

    for (let line of lines) {
        const parts = line.split(",");
        if (parts[0] === driverID && parts[2] === date) {
            return {};
        }
    }

    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const met = metQuota(date, activeTime);

    const newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: met,
        hasBonus: false
    };

    const line =
        `${newRecord.driverID},${newRecord.driverName},${newRecord.date},${newRecord.startTime},${newRecord.endTime},${newRecord.shiftDuration},${newRecord.idleTime},${newRecord.activeTime},${newRecord.metQuota},${newRecord.hasBonus}`;

    fs.appendFileSync(textFile, "\n" + line);

    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    const fileContent = fs.readFileSync(textFile, "utf8");
    const lines = fileContent.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = String(newValue);
            lines[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, "utf8");
    const lines = fileContent.split("\n");

    let driverExists = false;
    let count = 0;

    for (let line of lines) {

        if (line.trim() === "") continue;

        const parts = line.split(",");

        if (parts.length < 10) continue;

        const currentDriverID = parts[0];
        const date = parts[2];
        const hasBonus = parts[9];

        if (!date) continue;

        const monthInFile = String(Number(date.split("-")[1]));

        if (currentDriverID === driverID) {
            driverExists = true;

            if (monthInFile === String(Number(month)) && hasBonus === "true") {
                count++;
            }
        }
    }

    if (!driverExists) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, "utf8");
    const lines = fileContent.split("\n");

    let totalSeconds = 0;

    for (let line of lines) {
        const parts = line.split(",");

        const currentDriverID = parts[0];
        const date = parts[2];
        const activeTime = parts[7];

        const monthInFile = String(Number(date.split("-")[1]));

        if (currentDriverID === driverID && monthInFile === String(Number(month))) {
            totalSeconds += durationToSeconds(activeTime);
        }
    }

    return secondsToTime(totalSeconds);}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const rateContent = fs.readFileSync(rateFile, "utf8");
    const rateLines = rateContent.split("\n");

    let dayOff = "";

    for (let line of rateLines) {
        const parts = line.split(",");
        if (parts[0] === driverID) {
            dayOff = parts[1];
        }
    }

    const fileContent = fs.readFileSync(textFile, "utf8");
    const lines = fileContent.split("\n");

    let totalSeconds = 0;

    for (let line of lines) {
        const parts = line.split(",");

        const currentDriverID = parts[0];
        const date = parts[2];

        const monthInFile = String(Number(date.split("-")[1]));

        if (currentDriverID === driverID && monthInFile === String(Number(month))) {

            const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });

            if (dayName !== dayOff) {
                if (date >= "2025-04-10" && date <= "2025-04-30") {
                    totalSeconds += 6 * 3600;
                } else {
                    totalSeconds += 8 * 3600 + 24 * 60;
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    if (totalSeconds < 0) {
        totalSeconds = 0;
    }

    return secondsToTime(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    const rateContent = fs.readFileSync(rateFile, "utf8");
    const rateLines = rateContent.split("\n");

    let basePay = 0;
    let tier = 0;

    for (let line of rateLines) {
        const parts = line.split(",");
        if (parts[0] === driverID) {
            basePay = Number(parts[2]);
            tier = Number(parts[3]);
        }
    }

    const actualSeconds = durationToSeconds(actualHours);
    const requiredSeconds = durationToSeconds(requiredHours);

    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }

    let allowanceHours = 0;

    if (tier === 1) allowanceHours = 50;
    if (tier === 2) allowanceHours = 20;
    if (tier === 3) allowanceHours = 10;
    if (tier === 4) allowanceHours = 3;

    let missingSeconds = requiredSeconds - actualSeconds;
    missingSeconds -= allowanceHours * 3600;

    if (missingSeconds <= 0) {
        return basePay;
    }

    const fullMissingHours = Math.floor(missingSeconds / 3600);
    const deductionPerHour = Math.floor(basePay / 185);

    return basePay - (fullMissingHours * deductionPerHour);
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
