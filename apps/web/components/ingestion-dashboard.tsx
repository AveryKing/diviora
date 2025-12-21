"use client";

import { useState } from "react";
import { SourceTypeSelector } from "@/components/SourceTypeSelector";
import { DatabaseWizard } from "@/components/DatabaseWizard";
import { CSVWizard } from "@/components/CSVWizard";
import { api } from "@/lib/api"; // Use our real API client!

export function IngestionDashboard() {
  const [sourceType, setSourceType] = useState<"csv" | "database" | null>(null);

  // This function bridges your UI with the NestJS Backend
  const handleDatabaseConnect = async (config: Record<string, any>) => {
    try {
      console.log("Connecting to:", config);
      // 1. Create Source
      const source = await api.post<{ id: string }>("ingestion/data-sources", {
        name: `SQL - ${config.host}`,
        type: "sql",
        configuration: JSON.stringify(config),
      });

      // 2. Return the tables to the wizard
      const tables = await api.get<any[]>(
        `ingestion/data-sources/${(source as { id: string }).id}/tables`
      );
      return tables;
    } catch (err) {
      console.error(err);
      throw err; // The Wizard component handles the error UI
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="mb-12 text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          New Ingestion Pipeline
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Connect your data sources securely. Diviora supports high-performance
          streaming for both flat files and relational databases.
        </p>
      </div>

      {/* Step 1: Select Type */}
      {!sourceType && (
        <SourceTypeSelector
          onSelectType={(type: "csv" | "database") => setSourceType(type)}
        />
      )}

      {/* Step 2: Configure */}
      <div className="mt-8 transition-all">
        {sourceType === "database" && (
          <DatabaseWizard
            onBack={() => setSourceType(null)}
            // If you want to extend DatabaseWizard to accept onConnect, add it to the component definition
          />
        )}

        {sourceType === "csv" && (
          <CSVWizard onBack={() => setSourceType(null)} />
        )}
      </div>
    </div>
  );
}
