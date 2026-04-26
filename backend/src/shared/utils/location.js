const { ValidationError } = require("./errors");

function cityName(record) {
  return record && record.city ? record.city.name : "";
}

function countryName(record) {
  return record && record.country ? record.country.name : "";
}

function withLocation(record) {
  if (!record) return record;
  return {
    ...record,
    city: cityName(record),
    country: countryName(record),
  };
}

function withLocations(records) {
  return records.map((record) => withLocation(record));
}

async function resolveLocation(prisma, countryInput, cityInput, fallback = {}) {
  const countryNameValue = (countryInput || fallback.country || "Turkey").trim();
  const cityNameValue = (cityInput || fallback.city || "Ankara").trim();
  const country = await prisma.country.findFirst({
    where: {
      OR: [
        { name: { equals: countryNameValue, mode: "insensitive" } },
        { code: { equals: countryNameValue, mode: "insensitive" } },
      ],
    },
  });
  if (!country) throw new ValidationError("Selected country is not supported.");
  const city = await prisma.city.findFirst({
    where: {
      countryId: country.id,
      name: { equals: cityNameValue, mode: "insensitive" },
    },
  });
  if (!city) throw new ValidationError("Selected city is not supported for this country.");
  return { countryId: country.id, cityId: city.id, country, city };
}

module.exports = { withLocation, withLocations, resolveLocation };
