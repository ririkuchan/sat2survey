
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = new URL(
  process.env.SAT2SURVEY_TEST_URL ??
    "http://127.0.0.1:3000"
);

// Never run these tests against an external server.
if (
  baseUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(
    baseUrl.hostname
  )
) {
  throw new Error(
    "API tests must target a local HTTP server."
  );
}

async function request(
  path: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(new URL(path, baseUrl), options);
}

function createPayload(
  name = `Sat2Survey API Test ${randomUUID()}`
) {
  return {
    name,
    flood: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [139, 35],
                [139.01, 35],
                [139.01, 35.01],
                [139, 35.01],
                [139, 35],
              ],
            ],
          },
          properties: {},
        },
      ],
    },
    sites: [
      {
        id: "SITE-1",
        name: "Test Clinic",
        latitude: 35.005,
        longitude: 139.005,
        importance: 5,
      },
    ],
    flightSettings: {
      base: {
        latitude: 35,
        longitude: 139,
      },
      speedKmH: 36,
      maxFlightMinutes: 30,
      inspectionMinutes: 2,
    },
  };
}

type Payload = ReturnType<typeof createPayload>;

function postJson(payload: unknown): Promise<Response> {
  return request("/api/missions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function listMissions(): Promise<
  Array<{ id: string; name: string }>
> {
  const response = await request("/api/missions");
  assert.equal(response.status, 200);

  const data = (await response.json()) as {
    missions?: Array<{ id: string; name: string }>;
  };

  if (!Array.isArray(data.missions)) {
    throw new Error("Invalid mission-list response.");
  }

  return data.missions;
}

// Test 1: GET /api/missions
test("lists saved missions", async () => {
  const missions = await listMissions();
  assert.ok(Array.isArray(missions));
});

// Test 2: malformed JSON
test("rejects malformed JSON", async () => {
  const response = await request("/api/missions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{invalid-json",
  });

  assert.equal(response.status, 400);
});

// Tests 3-8: validation and database integrity
const invalidCases: Array<{
  description: string;
  modify: (payload: Payload) => void;
}> = [
  {
    description: "blank mission name",
    modify: (payload) => {
      payload.name = " ";
    },
  },
  {
    description: "mission name over 100 characters",
    modify: (payload) => {
      payload.name = "X".repeat(101);
    },
  },
  {
    description: "invalid flood GeoJSON",
    modify: (payload) => {
      payload.flood.features = [];
    },
  },
  {
    description: "invalid site coordinates",
    modify: (payload) => {
      payload.sites[0].latitude = 95;
    },
  },
  {
    description: "duplicate site IDs",
    modify: (payload) => {
      payload.sites.push({
        ...payload.sites[0],
        name: "Duplicate Site",
      });
    },
  },
  {
    description: "invalid flight speed",
    modify: (payload) => {
      payload.flightSettings.speedKmH = 0;
    },
  },
];

for (const testCase of invalidCases) {
  test(
    `rejects ${testCase.description} without saving`,
    async () => {
      const before = (await listMissions())
        .map((mission) => mission.id)
        .sort();

      const payload = createPayload();
      testCase.modify(payload);

      const response = await postJson(payload);
      assert.equal(response.status, 400);

      const data = (await response.json()) as {
        error?: string;
      };
      assert.equal(typeof data.error, "string");

      const after = (await listMissions())
        .map((mission) => mission.id)
        .sort();

      assert.deepEqual(after, before);
    }
  );
}

// Test 9: GET unknown ID
test("returns 404 for an unknown mission", async () => {
  const id = `missing-${randomUUID()}`;

  const response = await request(
    `/api/missions/${id}`
  );

  assert.equal(response.status, 404);
});

// Test 10: DELETE unknown ID
test("returns 404 when deleting an unknown mission", async () => {
  const id = `missing-${randomUUID()}`;

  const response = await request(
    `/api/missions/${id}`,
    { method: "DELETE" }
  );

  assert.equal(response.status, 404);
});

// Test 11: full persistence lifecycle
test("saves, lists, loads, and deletes a mission", async () => {
  const payload = createPayload();
  let createdId: string | undefined;

  try {
    // Save
    const saved = await postJson(payload);
    assert.equal(saved.status, 201);

    const savedData = (await saved.json()) as {
      mission?: { id: string; name: string };
    };

    const id = savedData.mission?.id;

    if (!id) {
      throw new Error("Saved mission ID is missing.");
    }

    createdId = id;
    assert.equal(savedData.mission?.name, payload.name);

    // List
    const missions = await listMissions();
    assert.ok(
      missions.some((mission) => mission.id === id)
    );

    // Load
    const loaded = await request(
      `/api/missions/${encodeURIComponent(id)}`
    );

    assert.equal(loaded.status, 200);

    const loadedData = (await loaded.json()) as {
      mission: {
        id: string;
        name: string;
        flood: unknown;
        sites: unknown;
        flightSettings: unknown;
      };
    };

    assert.equal(loadedData.mission.id, id);
    assert.equal(loadedData.mission.name, payload.name);
    assert.deepEqual(loadedData.mission.flood, payload.flood);
    assert.deepEqual(loadedData.mission.sites, payload.sites);
    assert.deepEqual(
      loadedData.mission.flightSettings,
      payload.flightSettings
    );

    // Delete
    const deleted = await request(
      `/api/missions/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );

    assert.equal(deleted.status, 200);
    createdId = undefined;

    // Verify the record no longer exists
    const afterDelete = await request(
      `/api/missions/${encodeURIComponent(id)}`
    );

    assert.equal(afterDelete.status, 404);
  } finally {
    // Clean up only the mission created by this test.
    if (createdId) {
      await request(
        `/api/missions/${encodeURIComponent(createdId)}`,
        { method: "DELETE" }
      );
    }
  }
});
