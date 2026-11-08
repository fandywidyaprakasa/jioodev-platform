#!/usr/bin/env node
/**
 * Section SDK — CLI validation tool
 * Usage: node validate-section.mjs <slot-code> [variant-code]
 *        node validate-section.mjs --all
 */

import { program } from "commander";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLibraryRoot() {
  return process.env.JIOODEV_LIBRARY_DIR ?? path.join(__dirname, "..", "..", "library");
}

async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function validateSlot(slotCode, libraryRoot) {
  const errors = [];
  const warnings = [];

  const slotPath = path.join(libraryRoot, "sections", slotCode, "slot.json");
  const slotData = await readJsonFile(slotPath);

  if (!slotData) {
    return { valid: false, errors: [`Missing slot.json at ${slotPath}`], warnings, data: null };
  }

  if (slotData.record_type !== "slot") {
    errors.push(`slot.json: record_type must be "slot"`);
  }
  if (!slotData.code || slotData.code !== slotCode) {
    errors.push(`slot.json: code mismatch or missing`);
  }
  if (!slotData.name) errors.push(`slot.json: name is required`);
  if (!slotData.display_name) errors.push(`slot.json: display_name is required`);
  if (typeof slotData.required !== "boolean") errors.push(`slot.json: required must be boolean`);
  if (typeof slotData.order_min !== "number") errors.push(`slot.json: order_min must be number`);
  if (typeof slotData.order_max !== "number") errors.push(`slot.json: order_max must be number`);
  if (!slotData.content_schema) errors.push(`slot.json: content_schema is required`);
  if (!slotData.tier_min) errors.push(`slot.json: tier_min is required`);
  if (!slotData.license) errors.push(`slot.json: license is required`);
  if (!slotData.status) errors.push(`slot.json: status is required`);
  if (typeof slotData.version !== "number") errors.push(`slot.json: version must be number`);

  const validTiers = ["BASIC", "PRO", "AGENCY"];
  if (slotData.tier_min && !validTiers.includes(slotData.tier_min)) {
    errors.push(`slot.json: tier_min must be one of ${validTiers.join(", ")}`);
  }

  const validStatuses = ["DRAFT", "CLASSIFIED", "READY", "DEPRECATED"];
  if (slotData.status && !validStatuses.includes(slotData.status)) {
    errors.push(`slot.json: status must be one of ${validStatuses.join(", ")}`);
  }

  if (slotData.content_schema) {
    if (typeof slotData.content_schema.version !== "number") {
      errors.push(`slot.json: content_schema.version must be number`);
    }
    if (!slotData.content_schema.fields || typeof slotData.content_schema.fields !== "object") {
      errors.push(`slot.json: content_schema.fields must be object`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, data: slotData };
}

async function validateVariant(slotCode, variantCode, libraryRoot) {
  const errors = [];
  const warnings = [];

  const variantDir = path.join(libraryRoot, "sections", slotCode, variantCode);
  const variantPath = path.join(variantDir, "variant.json");
  const variantData = await readJsonFile(variantPath);

  if (!variantData) {
    return { valid: false, errors: [`Missing variant.json at ${variantPath}`], warnings, data: null };
  }

  if (variantData.record_type !== "variant") {
    errors.push(`variant.json: record_type must be "variant"`);
  }
  if (!variantData.code || variantData.code !== variantCode) {
    errors.push(`variant.json: code mismatch or missing`);
  }
  if (!variantData.name) errors.push(`variant.json: name is required`);
  if (!variantData.display_name) errors.push(`variant.json: display_name is required`);
  if (!variantData.slot_code) errors.push(`variant.json: slot_code is required`);
  if (variantData.slot_code !== slotCode) {
    errors.push(`variant.json: slot_code "${variantData.slot_code}" does not match slot "${slotCode}"`);
  }
  if (!variantData.html_partial) errors.push(`variant.json: html_partial is required`);
  if (!variantData.css_scope) errors.push(`variant.json: css_scope is required`);
  if (typeof variantData.js_scope !== "string") errors.push(`variant.json: js_scope must be string`);
  if (!Array.isArray(variantData.compatible_themes)) errors.push(`variant.json: compatible_themes must be array`);
  if (!Array.isArray(variantData.compatible_tiers) || variantData.compatible_tiers.length === 0) {
    errors.push(`variant.json: compatible_tiers must be non-empty array`);
  }
  if (!Array.isArray(variantData.dependencies)) errors.push(`variant.json: dependencies must be array`);
  if (!variantData.license) errors.push(`variant.json: license is required`);
  if (!variantData.status) errors.push(`variant.json: status is required`);
  if (typeof variantData.version !== "number") errors.push(`variant.json: version must be number`);

  const validTiers = ["BASIC", "PRO", "AGENCY"];
  if (Array.isArray(variantData.compatible_tiers)) {
    for (const tier of variantData.compatible_tiers) {
      if (!validTiers.includes(tier)) {
        errors.push(`variant.json: compatible_tiers contains invalid tier "${tier}"`);
      }
    }
  }

  const validStatuses = ["DRAFT", "CLASSIFIED", "READY", "DEPRECATED"];
  if (variantData.status && !validStatuses.includes(variantData.status)) {
    errors.push(`variant.json: status must be one of ${validStatuses.join(", ")}`);
  }

  if (variantData.html_partial) {
    const htmlPath = path.join(libraryRoot, variantData.html_partial);
    try {
      await fs.access(htmlPath);
    } catch {
      errors.push(`HTML partial not found: ${variantData.html_partial}`);
    }
  }

  if (variantData.css_scope) {
    const cssPath = path.join(libraryRoot, variantData.css_scope);
    try {
      await fs.access(cssPath);
    } catch {
      warnings.push(`CSS scope not found: ${variantData.css_scope}`);
    }
  }

  if (variantData.js_scope && variantData.js_scope.length > 0) {
    const jsPath = path.join(libraryRoot, variantData.js_scope);
    try {
      await fs.access(jsPath);
    } catch {
      warnings.push(`JS scope not found: ${variantData.js_scope}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, data: variantData };
}

async function listVariants(slotCode, libraryRoot) {
  try {
    const slotDir = path.join(libraryRoot, "sections", slotCode);
    const entries = await fs.readdir(slotDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function validateAll(libraryRoot) {
  const sectionsDir = path.join(libraryRoot, "sections");
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSlots = 0;
  let totalVariants = 0;

  try {
    const slotEntries = await fs.readdir(sectionsDir, { withFileTypes: true });
    const slotCodes = slotEntries
      .filter((entry) => entry.isDirectory() && entry.name !== "_starter")
      .map((entry) => entry.name);

    for (const slotCode of slotCodes) {
      totalSlots++;
      const slotResult = await validateSlot(slotCode, libraryRoot);

      console.log(`\n📁 Slot: ${slotCode}`);
      if (slotResult.valid) {
        console.log(`  ✅ slot.json valid`);
      } else {
        console.log(`  ❌ slot.json invalid`);
        for (const error of slotResult.errors) {
          console.log(`     - ${error}`);
          totalErrors++;
        }
      }
      for (const warning of slotResult.warnings) {
        console.log(`     ⚠️  ${warning}`);
        totalWarnings++;
      }

      const variants = await listVariants(slotCode, libraryRoot);
      for (const variantCode of variants) {
        if (variantCode === "_starter") continue;
        totalVariants++;
        const variantResult = await validateVariant(slotCode, variantCode, libraryRoot);

        if (variantResult.valid) {
          console.log(`    ✅ Variant: ${variantCode}`);
        } else {
          console.log(`    ❌ Variant: ${variantCode}`);
          for (const error of variantResult.errors) {
            console.log(`       - ${error}`);
            totalErrors++;
          }
        }
        for (const warning of variantResult.warnings) {
          console.log(`       ⚠️  ${warning}`);
          totalWarnings++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Slots checked: ${totalSlots}`);
    console.log(`  Variants checked: ${totalVariants}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Warnings: ${totalWarnings}`);

    if (totalErrors > 0) process.exit(1);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

async function validateSingle(slotCode, variantCode, libraryRoot) {
  console.log(`Validating ${slotCode}${variantCode ? ` / ${variantCode}` : ""}...\n`);

  const slotResult = await validateSlot(slotCode, libraryRoot);

  console.log(`📁 Slot: ${slotCode}`);
  if (slotResult.valid) {
    console.log(`  ✅ slot.json valid`);
  } else {
    console.log(`  ❌ slot.json invalid`);
    for (const error of slotResult.errors) {
      console.log(`     - ${error}`);
    }
  }
  for (const warning of slotResult.warnings) {
    console.log(`     ⚠️  ${warning}`);
  }

  if (variantCode) {
    const variantResult = await validateVariant(slotCode, variantCode, libraryRoot);

    console.log(`\n🎨 Variant: ${variantCode}`);
    if (variantResult.valid) {
      console.log(`  ✅ variant.json valid`);
    } else {
      console.log(`  ❌ variant.json invalid`);
      for (const error of variantResult.errors) {
        console.log(`     - ${error}`);
      }
    }
    for (const warning of variantResult.warnings) {
      console.log(`     ⚠️  ${warning}`);
    }

    if (!slotResult.valid || !variantResult.valid) process.exit(1);
  } else if (!slotResult.valid) {
    process.exit(1);
  }
}

program
  .name("validate-section")
  .description("Validate section slot and variant configuration")
  .version("1.0.0")
  .argument("[slot-code]", "Slot code (e.g., S-HERO)")
  .argument("[variant-code]", "Variant code (e.g., hero-centered)")
  .option("-a, --all", "Validate all sections in library")
  .option("-r, --root <path>", "Library root path")
  .action(async (slotCode, variantCode, options) => {
    const libraryRoot = options.root ?? getLibraryRoot();

    if (options.all) {
      await validateAll(libraryRoot);
    } else if (slotCode) {
      await validateSingle(slotCode, variantCode, libraryRoot);
    } else {
      program.help();
    }
  });

program.parse();
