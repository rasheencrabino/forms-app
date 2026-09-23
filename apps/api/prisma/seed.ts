import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Password123!";

async function upsertUser(email: string) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
}

async function main() {
  console.log("Seeding database...");

  const owner1 = await upsertUser("owner1@example.com");
  const owner2 = await upsertUser("owner2@example.com");

  // ---- Form 1: every question type, published, webhook configured -------
  const surveySlug = "customer-feedback-survey-demo";
  await prisma.form.deleteMany({ where: { slug: surveySlug } });
  const survey = await prisma.form.create({
    data: {
      ownerId: owner1.id,
      title: "Customer Feedback Survey",
      description: "A form exercising every supported question type.",
      slug: surveySlug,
      isPublished: true,
      webhookUrl: "http://localhost:4100/webhook",
      webhookSecret: "supersecretwebhook123",
      questions: {
        create: [
          { type: "SHORT_TEXT", label: "What is your name?", order: 0, required: true, config: {} },
          { type: "LONG_TEXT", label: "Tell us about your experience", order: 1, required: false, config: {} },
          { type: "DATE", label: "When did you last visit?", order: 2, required: true, config: {} },
          {
            type: "DROPDOWN",
            label: "Which plan are you on?",
            order: 3,
            required: true,
            config: { options: ["Free", "Pro", "Enterprise"] },
          },
          {
            type: "MULTI_SELECT",
            label: "Which features do you use?",
            order: 4,
            required: false,
            config: { options: ["Forms", "Webhooks", "Export", "API"] },
          },
          {
            type: "MULTIPLE_CHOICE",
            label: "How did you hear about us?",
            order: 5,
            required: true,
            config: { options: ["Search", "Friend", "Social media", "Other"] },
          },
          {
            type: "CHECKBOXES",
            label: "Which devices do you use our product on?",
            order: 6,
            required: false,
            config: { options: ["Desktop", "Mobile", "Tablet"] },
          },
          {
            type: "LINEAR_SCALE",
            label: "How likely are you to recommend us?",
            order: 7,
            required: true,
            config: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" },
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const q = survey.questions;
  function snapshot(values: Record<number, unknown>) {
    return q.map((question, idx) => ({
      id: question.id,
      type: question.type,
      label: question.label,
      required: question.required,
      order: question.order,
      config: question.config,
      value: values[idx] ?? null,
    }));
  }

  await prisma.response.createMany({
    data: [
      {
        formId: survey.id,
        email: "alice@example.com",
        answers: snapshot({
          0: "Alice Nguyen",
          1: "Great product, easy to use.",
          2: "2026-08-01",
          3: "Pro",
          4: ["Forms", "Export"],
          5: "Friend",
          6: ["Desktop", "Mobile"],
          7: 9,
        }),
      },
      {
        formId: survey.id,
        email: "bob@example.com",
        answers: snapshot({
          0: "Bob Martinez",
          1: "",
          2: "2026-07-15",
          3: "Free",
          4: [],
          5: "Search",
          6: ["Desktop"],
          7: 6,
        }),
      },
      {
        formId: survey.id,
        email: "carol@example.com",
        answers: snapshot({
          0: "Carol Diaz",
          1: "Webhooks saved us a ton of integration work.",
          2: "2026-09-10",
          3: "Enterprise",
          4: ["Webhooks", "API"],
          5: "Social media",
          6: ["Mobile", "Tablet"],
          7: 10,
        }),
      },
      {
        formId: survey.id,
        // Same email submitting twice — each submission is independent.
        email: "alice@example.com",
        answers: snapshot({
          0: "Alice Nguyen",
          1: "Following up after the new release.",
          2: "2026-09-18",
          3: "Pro",
          4: ["Forms"],
          5: "Friend",
          6: ["Mobile"],
          7: 8,
        }),
      },
    ],
  });

  // ---- Form 2: simple published form, a couple of responses --------------
  const hackathonSlug = "weekend-hackathon-signup-demo";
  await prisma.form.deleteMany({ where: { slug: hackathonSlug } });
  const hackathon = await prisma.form.create({
    data: {
      ownerId: owner1.id,
      title: "Weekend Hackathon Signup",
      description: "Sign up for the Q3 internal hackathon.",
      slug: hackathonSlug,
      isPublished: true,
      questions: {
        create: [
          { type: "SHORT_TEXT", label: "Team name", order: 0, required: true, config: {} },
          {
            type: "DROPDOWN",
            label: "Team size",
            order: 1,
            required: true,
            config: { options: ["1", "2", "3", "4+"] },
          },
          { type: "DATE", label: "Available start date", order: 2, required: false, config: {} },
        ],
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  const hq = hackathon.questions;
  await prisma.response.createMany({
    data: [
      {
        formId: hackathon.id,
        email: "dave@example.com",
        answers: [
          { id: hq[0].id, type: hq[0].type, label: hq[0].label, required: hq[0].required, order: hq[0].order, config: hq[0].config, value: "Night Owls" },
          { id: hq[1].id, type: hq[1].type, label: hq[1].label, required: hq[1].required, order: hq[1].order, config: hq[1].config, value: "3" },
          { id: hq[2].id, type: hq[2].type, label: hq[2].label, required: hq[2].required, order: hq[2].order, config: hq[2].config, value: "2026-10-02" },
        ],
      },
      {
        formId: hackathon.id,
        email: "erin@example.com",
        answers: [
          { id: hq[0].id, type: hq[0].type, label: hq[0].label, required: hq[0].required, order: hq[0].order, config: hq[0].config, value: "Ctrl+Alt+Defeat" },
          { id: hq[1].id, type: hq[1].type, label: hq[1].label, required: hq[1].required, order: hq[1].order, config: hq[1].config, value: "4+" },
          { id: hq[2].id, type: hq[2].type, label: hq[2].label, required: hq[2].required, order: hq[2].order, config: hq[2].config, value: null },
        ],
      },
    ],
  });

  // ---- Form 3: draft, owned by owner2 ------------------------------------
  const retroSlug = "internal-team-retro-demo";
  await prisma.form.deleteMany({ where: { slug: retroSlug } });
  await prisma.form.create({
    data: {
      ownerId: owner2.id,
      title: "Internal Team Retro",
      description: "Draft — not yet published.",
      slug: retroSlug,
      isPublished: false,
      questions: {
        create: [
          { type: "LONG_TEXT", label: "What went well this sprint?", order: 0, required: true, config: {} },
          { type: "LONG_TEXT", label: "What could be improved?", order: 1, required: true, config: {} },
          {
            type: "LINEAR_SCALE",
            label: "Overall sprint satisfaction",
            order: 2,
            required: true,
            config: { min: 1, max: 5 },
          },
        ],
      },
    },
  });

  // ---- Form 4: published, owned by owner2, no responses ------------------
  const ideaBoxSlug = "product-idea-box-demo";
  await prisma.form.deleteMany({ where: { slug: ideaBoxSlug } });
  await prisma.form.create({
    data: {
      ownerId: owner2.id,
      title: "Product Idea Box",
      description: null,
      slug: ideaBoxSlug,
      isPublished: true,
      questions: {
        create: [
          { type: "LONG_TEXT", label: "Describe your idea", order: 0, required: true, config: {} },
          {
            type: "LINEAR_SCALE",
            label: "How excited are you about this?",
            order: 1,
            required: false,
            config: { min: 1, max: 10 },
          },
        ],
      },
    },
  });

  console.log("Seed complete.");
  console.log(`  Users: ${owner1.email} / ${owner2.email} (password: ${SEED_PASSWORD})`);
  console.log(`  Published form with every question type: /f/${surveySlug}`);
  console.log(`  Webhook configured on that form -> http://localhost:4100/webhook (secret: supersecretwebhook123)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
