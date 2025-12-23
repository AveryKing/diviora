"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowRight,
  Save,
  RotateCcw,
  TableProperties,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface ColumnDefinition {
  name: string;
  type: string;
  isNullable: string;
}

export interface SchemaConfig {
  tableName: string;
  columns: {
    source: string;
    target: string;
    type: string;
    included: boolean;
  }[];
}

interface SchemaMapperProps {
  tableName: string;
  fetchSchema: () => Promise<ColumnDefinition[]>;
  onSave: (config: SchemaConfig) => void;
  onBack: () => void;
}

export function SchemaMapper({
  tableName,
  fetchSchema,
  onSave,
  onBack,
}: SchemaMapperProps) {
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [mappings, setMappings] = useState<
    Record<string, { target: string; included: boolean }>
  >({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadSchema();
  }, [tableName]);

  const loadSchema = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSchema();
      setColumns(data);

      const initialMappings: Record<string, any> = {};
      data.forEach((col) => {
        initialMappings[col.name] = { target: col.name, included: true };
      });
      setMappings(initialMappings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (name: string) => {
    setMappings((prev) => ({
      ...prev,
      [name]: { ...prev[name], included: !prev[name].included },
    }));
  };

  const updateAlias = (name: string, alias: string) => {
    setMappings((prev) => ({
      ...prev,
      [name]: { ...prev[name], target: alias },
    }));
  };

  const handleSave = () => {
    const config: SchemaConfig = {
      tableName,
      columns: columns
        .map((col) => ({
          source: col.name,
          type: col.type,
          target: mappings[col.name]?.target || col.name,
          included: mappings[col.name]?.included ?? true,
        }))
        .filter((c) => c.included),
    };
    onSave(config);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Discovering schema for {tableName}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="text-destructive font-medium">
          Failed to load schema
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadSchema}>
          <RotateCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="p-8 text-center space-y-4 border rounded-lg bg-muted/20">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <TableProperties className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-base font-medium text-foreground">
          No columns were returned for {tableName}.
        </div>
        <p className="text-sm text-muted-foreground">
          Ensure the account has permission to read INFORMATION_SCHEMA and that
          the table name includes the schema if needed.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onBack}>
            Back to Tables
          </Button>
          <Button onClick={loadSchema}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retry discovery
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Map Columns for {tableName}</h3>
          <p className="text-sm text-muted-foreground">
            Select columns to ingest, rename destinations, and skip anything you
            don&apos;t need.
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-1">
          {columns.length} column{columns.length === 1 ? "" : "s"} discovered
        </Badge>
      </div>

      <Card className="border-2">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/40 text-sm font-medium text-muted-foreground">
            <div className="col-span-1 text-center">Include</div>
            <div className="col-span-5">Source Column</div>
            <div className="col-span-1 text-center"></div>
            <div className="col-span-5">Destination Field</div>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {columns.map((col) => {
                const map = mappings[col.name];
                return (
                  <div
                    key={col.name}
                    className={`grid grid-cols-12 gap-4 p-3 items-center hover:bg-muted/20 transition-colors ${
                      !map?.included ? "opacity-50 grayscale" : ""
                    }`}
                  >
                    <div className="col-span-1 flex justify-center">
                      <Checkbox
                        checked={map?.included}
                        onCheckedChange={() => toggleColumn(col.name)}
                      />
                    </div>
                    <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                      <span className="font-medium truncate" title={col.name}>
                        {col.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1 uppercase tracking-wider text-muted-foreground"
                      >
                        {col.type}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex justify-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="col-span-5">
                      <Input
                        value={map?.target}
                        onChange={(e) => updateAlias(col.name, e.target.value)}
                        disabled={!map?.included}
                        className="h-8 font-mono text-sm"
                        placeholder={col.name}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back to Tables
        </Button>
        <Button
          onClick={handleSave}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4" /> Save Pipeline
        </Button>
      </div>
    </div>
  );
}
