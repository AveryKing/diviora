"use client";

import { useState } from "react";
import { SourceTypeSelector } from "@/components/SourceTypeSelector";
import { DatabaseWizard } from "@/components/DatabaseWizard";
import { CSVWizard } from "@/components/CSVWizard";
import { api } from "@/lib/api";

export function IngestionDashboard() {
  const [sourceType, setSourceType] = useState<"csv" | "database" | null>(null);

  type DataSourceResponse = { id: string; [key: string]: any };
  const handleDatabaseConnect = async (config: any) => {
    try {
      console.log("Connecting to:", config);
      const source = await api.post<DataSourceResponse>(
        "ingestion/data-sources",
        {
          name: `SQL - ${config.host}`,
          type: "sql",
          configuration: JSON.stringify(config),
        }
      );

      const tables = await api.get(
        `ingestion/data-sources/${source.id}/tables`
      );
      return tables;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-6">
      {!sourceType && (
        <SourceTypeSelector onSelectType={(type) => setSourceType(type)} />
      )}

      <div className="mt-8 transition-all">
        {sourceType === "database" && (
          <DatabaseWizard
            onBack={() => setSourceType(null)}
            onConnect={handleDatabaseConnect}
          />
        )}

        {sourceType === "csv" && (
          <CSVWizard onBack={() => setSourceType(null)} />
        )}
      </div>
    </div>
  );
}
