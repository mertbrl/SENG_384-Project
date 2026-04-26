const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const turkey = await prisma.country.upsert({
    where: { code: "TR" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      name: "Turkey",
      code: "TR",
    },
  });

  const istanbul = await prisma.city.upsert({
    where: { countryId_name: { countryId: turkey.id, name: "Istanbul" } },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000001",
      countryId: turkey.id,
      name: "Istanbul",
    },
  });

  const ankara = await prisma.city.upsert({
    where: { countryId_name: { countryId: turkey.id, name: "Ankara" } },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000002",
      countryId: turkey.id,
      name: "Ankara",
    },
  });

  await prisma.city.upsert({
    where: { countryId_name: { countryId: turkey.id, name: "Izmir" } },
    update: {},
    create: {
      id: "20000000-0000-0000-0000-000000000003",
      countryId: turkey.id,
      name: "Izmir",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@healthai.edu.tr" },
    update: {},
    create: {
      fullName: "Platform Admin",
      email: "admin@healthai.edu.tr",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "admin",
      institution: "ClinBridge Platform",
      cityId: istanbul.id,
      countryId: turkey.id,
      verified: true,
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: "engineer@itu.edu.tr" },
    update: {},
    create: {
      fullName: "Ayse Kaya",
      email: "engineer@itu.edu.tr",
      passwordHash: await bcrypt.hash("Engineer123!", 10),
      role: "engineer",
      institution: "Istanbul Technical University",
      cityId: istanbul.id,
      countryId: turkey.id,
      expertise: "Machine Learning, NLP",
      bio: "AI researcher with focus on clinical decision support.",
      verified: true,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@hacettepe.edu.tr" },
    update: {},
    create: {
      fullName: "Dr. Mehmet Yilmaz",
      email: "doctor@hacettepe.edu.tr",
      passwordHash: await bcrypt.hash("Doctor123!", 10),
      role: "healthcare",
      institution: "Hacettepe University Hospital",
      cityId: ankara.id,
      countryId: turkey.id,
      expertise: "Oncology, Clinical Trials",
      bio: "Oncologist interested in AI-assisted diagnostics.",
      verified: true,
    },
  });

  await prisma.post.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      userId: doctor.id,
      countryId: turkey.id,
      cityId: ankara.id,
      title: "AI-Powered Early Cancer Detection System",
      workingDomain: "Oncology",
      projectStage: "idea",
      requiredExpertise: "Machine Learning, Computer Vision",
      healthcareNeed: "Need an ML engineer to process radiology images for early-stage tumor detection.",
      technicalNeed: "Machine learning engineering support for image-processing model design and validation planning.",
      commitmentLevel: "medium",
      collaborationType: "research_partner",
      confidentialityLevel: "nda_required",
      shortExplanation:
        "We want to develop an AI pipeline that analyzes CT scans to flag potential malignancies.",
      expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: "active",
    },
  });

  await prisma.post.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      userId: engineer.id,
      countryId: turkey.id,
      cityId: istanbul.id,
      title: "NLP System for Clinical Note Summarisation",
      workingDomain: "Medical Informatics",
      projectStage: "prototype_developed",
      requiredExpertise: "Clinical Domain Knowledge, EHR Systems",
      healthcareNeed:
        "Looking for a clinician to validate our BERT-based clinical note summariser and provide workflow feedback.",
      technicalNeed:
        "Looking for a clinician to validate our BERT-based clinical note summariser and provide annotated ground truth data.",
      commitmentLevel: "low",
      collaborationType: "advisor",
      confidentialityLevel: "public",
      shortExplanation:
        "We have a working NLP prototype and need a healthcare partner to evaluate its clinical accuracy.",
      expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: "active",
    },
  });

  console.log("Seed complete.");
  console.log("Admin: admin@healthai.edu.tr / Admin123!");
  console.log("Engineer: engineer@itu.edu.tr / Engineer123!");
  console.log("Doctor: doctor@hacettepe.edu.tr / Doctor123!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
