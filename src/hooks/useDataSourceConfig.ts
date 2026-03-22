import { useCallback, useMemo } from "react";

import type { DataSource, DataSourceType } from "@/services/aiAgents";
import { useAIAgents } from "@/src/contexts/AIAgentsContext";

export type DataSourceConfigForm = {
  type: DataSourceType;
  endpoint: string;
  query: string;
  staticNumbers: string;
};

function parseStaticNumbers(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

/**
 * Bridges UI fields ↔ {@link DataSource} on {@link AIAgentsContext}.
 */
export function useDataSourceConfig() {
  const { dataSource, setDataSource } = useAIAgents();

  const form = useMemo((): DataSourceConfigForm => {
    const rows = dataSource.rows;
    const staticNumbers =
      Array.isArray(rows) && rows.length
        ? rows.filter((r): r is number => typeof r === "number").join(", ")
        : "";
    return {
      type: dataSource.type,
      endpoint: dataSource.endpoint ?? "",
      query: dataSource.query ?? "",
      staticNumbers,
    };
  }, [dataSource]);

  const applyForm = useCallback(
    (partial: Partial<DataSourceConfigForm>) => {
      setDataSource((prev) => {
        const next: DataSource = {
          ...prev,
          type: partial.type ?? prev.type,
          endpoint:
            partial.endpoint !== undefined ? partial.endpoint : prev.endpoint,
          query: partial.query !== undefined ? partial.query : prev.query,
        };
        if (partial.staticNumbers !== undefined) {
          const nums = parseStaticNumbers(partial.staticNumbers);
          next.type = "static";
          next.rows = nums.length ? nums : [0];
        }
        return next;
      });
    },
    [setDataSource],
  );

  return {
    form,
    applyForm,
    dataSource,
    setDataSource,
  };
}
