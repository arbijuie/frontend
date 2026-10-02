import {
  editableFieldsFromConfig,
  buildDraftFromConfig,
  buildDraftFromPreset,
  buildDiffRows,
  buildPatchPayload,
  detectConflicts,
  hasInvalidDraftValues,
} from "./configDraft";
import type { ConfigResponse } from "../api/types";

function makeConfig(overrides: Partial<ConfigResponse> = {}): ConfigResponse {
  return {
    min_score_bps: 5,
    require_isolated_margin: true,
    allow_unknown_margin_mode: false,
    api_host: "127.0.0.1",
    runbook_config_fields: [
      "min_score_bps",
      "require_isolated_margin",
      "allow_unknown_margin_mode",
    ],
    runbook_presets: {
      conservative: { min_score_bps: 12, require_isolated_margin: true },
    },
    ...overrides,
  } as ConfigResponse;
}

describe("editableFieldsFromConfig", () => {
  it("includes both numeric and boolean runbook fields", () => {
    const config = makeConfig();
    expect(editableFieldsFromConfig(config)).toEqual([
      "min_score_bps",
      "require_isolated_margin",
      "allow_unknown_margin_mode",
    ]);
  });

  it("excludes a listed field whose value is neither number nor boolean", () => {
    const config = makeConfig({
      runbook_config_fields: ["min_score_bps", "min_depth_quality"],
      min_depth_quality: "B",
    } as Partial<ConfigResponse>);
    expect(editableFieldsFromConfig(config)).toEqual(["min_score_bps"]);
  });
});

describe("buildDraftFromConfig", () => {
  it("stores numbers as strings and booleans as booleans", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);

    expect(draft.min_score_bps).toBe("5");
    expect(draft.require_isolated_margin).toBe(true);
  });
});

describe("buildDraftFromPreset", () => {
  it("uses the preset value when present, falls back to live config otherwise", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromPreset(config.runbook_presets.conservative, fields, config);

    expect(draft.min_score_bps).toBe("12");
    expect(draft.require_isolated_margin).toBe(true);
    expect(draft.allow_unknown_margin_mode).toBe(false); // not in preset, falls back to live
  });
});

describe("hasInvalidDraftValues", () => {
  it("flags a non-numeric string for a numeric field", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "not-a-number";

    expect(hasInvalidDraftValues(draft, fields)).toEqual(["min_score_bps"]);
  });

  it("never flags a boolean field", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);

    expect(hasInvalidDraftValues(draft, fields)).toEqual([]);
  });

  it("flags an empty string as invalid, not as zero", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "";

    expect(hasInvalidDraftValues(draft, fields)).toEqual(["min_score_bps"]);
  });
});

describe("buildDiffRows", () => {
  it("only includes fields that actually changed", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "9";

    const rows = buildDiffRows(draft, config, fields);

    expect(rows).toEqual([{ field: "min_score_bps", oldValue: 5, newValue: 9 }]);
  });

  it("includes a boolean flip", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.require_isolated_margin = false;

    const rows = buildDiffRows(draft, config, fields);

    expect(rows).toContainEqual({
      field: "require_isolated_margin",
      oldValue: true,
      newValue: false,
    });
  });

  it("skips an invalid numeric entry rather than reporting garbage", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "not-a-number";

    expect(buildDiffRows(draft, config, fields)).toEqual([]);
  });

  it("does not silently treat an empty string as 0", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "";

    expect(buildDiffRows(draft, config, fields)).toEqual([]);
  });
});

describe("buildPatchPayload", () => {
  it("matches buildDiffRows exactly, plus the persist flag", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "9";
    draft.require_isolated_margin = false;

    const payload = buildPatchPayload(draft, config, fields, true);

    expect(payload).toEqual({
      persist: true,
      min_score_bps: 9,
      require_isolated_margin: false,
    });
  });

  it("reflects persist: false explicitly", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);
    draft.min_score_bps = "9";

    const payload = buildPatchPayload(draft, config, fields, false);

    expect(payload).toEqual({ persist: false, min_score_bps: 9 });
  });

  it("sends only persist when nothing changed", () => {
    const config = makeConfig();
    const fields = editableFieldsFromConfig(config);
    const draft = buildDraftFromConfig(config, fields);

    expect(buildPatchPayload(draft, config, fields, true)).toEqual({ persist: true });
  });
});

describe("detectConflicts", () => {
  it("returns fields whose live value diverged from the baseline", () => {
    const baseline = makeConfig();
    const live = makeConfig({ min_score_bps: 7 });
    const fields = editableFieldsFromConfig(baseline);

    expect(detectConflicts(baseline, live, fields)).toEqual(["min_score_bps"]);
  });

  it("returns an empty list when nothing changed on the server", () => {
    const baseline = makeConfig();
    const live = makeConfig();
    const fields = editableFieldsFromConfig(baseline);

    expect(detectConflicts(baseline, live, fields)).toEqual([]);
  });
});
