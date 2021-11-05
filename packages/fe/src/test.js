import { mockFE, mockF, mockRun } from "@zhujianshi/fe";
import { main, getFromSql, getFromRedis, saveCache } from "./example";

clearAllMock();

test("main test", async () => {
  mockFE(getFromSql, () => {});
  mockFE(getFromRedis, () => {});
  const result = await mockRun(main);
});
