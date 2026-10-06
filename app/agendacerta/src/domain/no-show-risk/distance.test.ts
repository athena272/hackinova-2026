import { describe, expect, it } from "vitest";
import { distanceInKm } from "./distance";

const jardins = { latitude: -10.944, longitude: -37.056 };
const socorroCentro = { latitude: -10.855, longitude: -37.126 };

describe("distanceInKm", () => {
  it("é zero para o mesmo ponto", () => {
    expect(distanceInKm(jardins, jardins)).toBe(0);
  });

  it("é simétrica", () => {
    expect(distanceInKm(jardins, socorroCentro)).toBeCloseTo(
      distanceInKm(socorroCentro, jardins),
      10,
    );
  });

  it("estima Jardins até o Centro de Socorro em cerca de 12 km", () => {
    expect(distanceInKm(jardins, socorroCentro)).toBeCloseTo(12.5, 0);
  });

  it("1 grau de latitude vale cerca de 111 km", () => {
    const distance = distanceInKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(distance).toBeCloseTo(111.2, 1);
  });
});
