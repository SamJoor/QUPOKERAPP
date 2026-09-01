// lib/pokerMatch.ts is pure logic, but it imports lib/poker.ts, which pulls in the Supabase
// client and its native storage adapters. Stub those so the engine can be tested in isolation.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined)
}));
