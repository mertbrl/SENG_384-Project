const { Router } = require("express");
const { success } = require("../../shared/utils/apiResponse");
const { prisma } = require("../../config/database");
const { NotFoundError } = require("../../shared/utils/errors");

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const countries = await prisma.country.findMany({
      include: {
        cities: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    success(res, countries);
  } catch (err) {
    next(err);
  }
});

router.get("/countries", async (_req, res, next) => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
    });
    success(res, countries);
  } catch (err) {
    next(err);
  }
});

router.get("/countries/:id/cities", async (req, res, next) => {
  try {
    const country = await prisma.country.findUnique({ where: { id: req.params.id } });
    if (!country) throw new NotFoundError("Country");
    const cities = await prisma.city.findMany({
      where: { countryId: req.params.id },
      orderBy: { name: "asc" },
    });
    success(res, cities);
  } catch (err) {
    next(err);
  }
});

router.get("/cities", async (req, res, next) => {
  try {
    const { countryId } = req.query;
    const cities = await prisma.city.findMany({
      where: {
        ...(countryId && { countryId }),
      },
      include: { country: true },
      orderBy: { name: "asc" },
    });
    success(res, cities);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
