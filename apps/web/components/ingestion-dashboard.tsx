"use client";

import { useEffect, useState } from "react";
import { SourceTypeSelector } from "@/components/SourceTypeSelector";
import { DatabaseWizard } from "@/components/DatabaseWizard";
import { CSVWizard } from "@/components/CSVWizard";
import { JobMonitor } from "@/components/JobMonitor";
import { ColumnDefinition, SchemaConfig } from "@/components/SchemaMapper";
import { api } from "@/lib/api";

export function IngestionDashboard() {
  const [sourceType, setSourceType] = useState<"csv" | "database" | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [jobRefreshToken, setJobRefreshToken] = useState<number>(0);

  useEffect(() => {
    const stored = window.localStorage.getItem("currentSourceId");
    if (stored) {
      setCurrentSourceId(stored);
    }
  }, []);

  useEffect(() => {
    if (currentSourceId) {
      window.localStorage.setItem("currentSourceId", currentSourceId);
      setJobRefreshToken(Date.now());
    }
  }, [currentSourceId]);

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

      const tables = await api.get<string[]>(
        `ingestion/data-sources/${source.id}/tables`
      );
      setCurrentSourceId(source.id);

      return { sourceId: source.id, tables };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDiscoverSchema = async (
    tableName: string
  ): Promise<ColumnDefinition[]> => {
    if (!currentSourceId) {
      throw new Error("Please connect to a database first.");
    }

    return api.get<ColumnDefinition[]>(
      `ingestion/data-sources/${currentSourceId}/schema?table=${encodeURIComponent(
        tableName
      )}`
    );
  };

  const handleIngestionComplete = async (schema: SchemaConfig) => {
    if (!currentSourceId) return;

    try {
      await api.post(`ingestion/trigger/${currentSourceId}`, {
        tableName: schema.tableName,
        mappings: schema.columns,
      });
      setJobRefreshToken(Date.now());
    } finally {
      setSourceType(null);
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
            onDiscoverSchema={handleDiscoverSchema}
            onComplete={handleIngestionComplete}
          />
        )}

        {sourceType === "csv" && (
          <CSVWizard onBack={() => setSourceType(null)} />
        )}
      </div>

      {currentSourceId && (
        <JobMonitor sourceId={currentSourceId} refreshToken={jobRefreshToken} />
      )}
    </div>
  );
}
