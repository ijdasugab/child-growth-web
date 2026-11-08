/**
 * Uji formatter. Kode ini paling sering dipakai di tabel dan paling mudah
 * salah, jadi nilainya diuji langsung.
 */

import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatDate,
  formatDecimal,
  formatHeight,
  formatWeight,
  statusTone,
  toNumber,
} from "./format";

describe("toNumber", () => {
  it("menerima string dan number", () => {
    expect(toNumber("7.80")).toBe(7.8);
    expect(toNumber(12)).toBe(12);
  });

  it("membaca objek Decimal Prisma", () => {
    expect(toNumber({ s: 1, e: 0, d: [3, 2] })).toBeCloseTo(3.2, 10);
  });

  it("mengembalikan null untuk nilai kosong atau tidak masuk akal", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber("abc")).toBeNull();
  });
});

describe("formatDecimal", () => {
  it("memakai koma dan membuang nol di belakang", () => {
    expect(formatDecimal("7.80")).toBe("7,8");
    expect(formatDecimal("3.20")).toBe("3,2");
  });

  it("menampilkan tanda hubung saat kosong", () => {
    expect(formatDecimal(null)).toBe("-");
    expect(formatDecimal(undefined)).toBe("-");
  });

  it("menghormati jumlah digit yang diminta", () => {
    expect(formatDecimal("7.5", 2)).toBe("7,5");
    expect(formatDecimal("7.567", 2)).toBe("7,57");
  });
});

describe("formatWeight dan formatHeight", () => {
  it("menambahkan satuan", () => {
    expect(formatWeight("7.80")).toBe("7,8 kg");
    expect(formatHeight("68.50")).toBe("68,5 cm");
  });

  it("tidak menambahkan satuan kalau nilai kosong", () => {
    expect(formatWeight(null)).toBe("-");
    expect(formatHeight(null)).toBe("-");
  });
});

describe("formatDate", () => {
  it("memformat tanggal dalam bahasa Indonesia", () => {
    const hasil = formatDate("2024-01-15");
    expect(hasil).toContain("15");
    expect(hasil).toContain("2024");
  });

  it("aman terhadap nilai kosong atau salah", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("bukan tanggal")).toBe("-");
  });
});

describe("formatAge", () => {
  const acuan = new Date(2025, 0, 1);

  it("menghitung bulan untuk bayi di bawah satu tahun", () => {
    expect(formatAge("2024-06-01", acuan)).toBe("7 bulan");
  });

  it("menghitung tahun dan bulan", () => {
    expect(formatAge("2023-01-01", acuan)).toBe("2 tahun");
    expect(formatAge("2023-06-01", acuan)).toBe("1 tahun 7 bulan");
  });

  it("mengembalikan tanda hubung untuk tanggal kosong", () => {
    expect(formatAge(null)).toBe("-");
  });
});

describe("statusTone", () => {
  it("memetakan label ke kelas warna", () => {
    expect(statusTone("Normal")).toBe("normal");
    expect(statusTone("Kurang")).toBe("warning");
    expect(statusTone("Gizi buruk")).toBe("danger");
    expect(statusTone("Sangat pendek")).toBe("danger");
    expect(statusTone(null)).toBe("muted");
  });
});
