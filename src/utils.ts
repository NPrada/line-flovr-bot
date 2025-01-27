import { ShopConfig, Weekdays } from "../shop-configs.js";

export function convertQueryString(queryString: string) {
  const params = new URLSearchParams(queryString);
  let keyValues: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    keyValues[key] = value;
  }
  return keyValues;
}

export function addMonthsToDate(date: Date, months: number) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

export function addHoursToDate(date: Date, hours: number) {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

export function formatDateToDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}t${hours}:${minutes}`;
}

// Helper functions to parse and compare times
//EG 09:15
function parseTimeString(time: string): number {
  const [hh, mm] = time.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isDateOutsideOfWorkingHours(
  shopConfig: ShopConfig,
  selectedDate: string
): boolean {
  const selectedDateObj = new Date(selectedDate);
  const dayOfWeek = selectedDateObj.toLocaleString("en-US", {
    weekday: "long",
  }) as Weekdays;

  // Find the matching day in the shop’s array
  const matchingHours = shopConfig.workingHours.find(
    (wh) => wh.day === dayOfWeek
  );

  // If there's no match, the shop is closed that day
  if (!matchingHours) {
    return true;
  }

  const selectedMinutes = getMinutesFromMidnight(selectedDateObj);
  const openMinutes = parseTimeString(matchingHours.openingTime);
  const closeMinutes = parseTimeString(matchingHours.closingTime);

  // Check if the time is before opening or after closing
  if (selectedMinutes < openMinutes || selectedMinutes > closeMinutes) {
    return true;
  }

  return false;
}


// function formatDateToHumanReadable(date: Date){
//   date.
// }