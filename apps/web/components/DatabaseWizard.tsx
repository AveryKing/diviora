"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import {
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Table as TableIcon,
  Server,
  HardDrive,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { SchemaMapper, ColumnDefinition, SchemaConfig } from "./SchemaMapper";
import { Input as ShadInput } from "./ui/input";

type DatabaseType = "postgresql" | "mysql" | "mongodb" | "mssql" | "oracle";

interface DatabaseConfig {
  type: DatabaseType | "";
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

type ConnectionStatus = "idle" | "testing" | "success" | "error";

const databaseOptions: Record<
  DatabaseType,
  { port: string; label: string; color: string }
> = {
  mssql: {
    port: "1433",
    label: "Microsoft SQL Server",
    color: "text-blue-600",
  },
  postgresql: { port: "5432", label: "PostgreSQL", color: "text-indigo-600" },
  mysql: { port: "3306", label: "MySQL", color: "text-orange-600" },
  mongodb: { port: "27017", label: "MongoDB", color: "text-green-600" },
  oracle: { port: "1521", label: "Oracle DB", color: "text-red-600" },
};

type ConnectResult = { sourceId: string; tables: string[] } | string[];

interface DatabaseWizardProps {
  onBack?: () => void;
  onConnect?: (config: any) => Promise<ConnectResult>;
  onDiscoverSchema?: (tableName: string) => Promise<ColumnDefinition[]>;
  onComplete?: (config: SchemaConfig) => void;
}

export function DatabaseWizard({
  onBack,
  onConnect,
  onDiscoverSchema,
  onComplete,
}: DatabaseWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<DatabaseConfig>({
    type: "",
    name: "",
    host: "localhost",
    port: "",
    database: "",
    username: "",
    password: "",
  });
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState("");

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    setConfig({
      ...config,
      type,
      port: databaseOptions[type].port,
    });
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setErrorMessage("");

    try {
      if (onConnect) {
        const discovered = await onConnect(config);
        if (Array.isArray(discovered)) {
          setTables(discovered);
        } else {
          setTables(discovered.tables);
          setSourceId(discovered.sourceId);
        }
        setConnectionStatus("success");
        setTimeout(() => setStep(4), 1000);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setTables(["dbo.Users", "dbo.Orders", "dbo.Products", "audit.Logs"]);
        setConnectionStatus("success");
        setTimeout(() => setStep(4), 1000);
      }
    } catch (e) {
      setConnectionStatus("error");
      setErrorMessage(
        e instanceof Error ? e.message : "Unknown connection error"
      );
    }
  };

  const canProceedToStep2 = config.type !== "";
  const canProceedToStep3 =
    config.name &&
    config.host &&
    config.port &&
    config.database &&
    config.username;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 flex-wrap text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Database className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Connect Database
              </h1>
              <p className="text-sm text-white/70">
                Set up a source and map your schema.
              </p>
            </div>
          </div>
          <Badge className="bg-white/10 text-white border-white/20">
            Step {step} of {totalSteps}
          </Badge>
        </div>
        <div className="mt-5">
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>
      </div>

      {step === 1 && (
        <Card className="border border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Select Database Type</CardTitle>
            <CardDescription className="text-slate-600">
              Choose the protocol we should use to connect.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(databaseOptions) as DatabaseType[]).map(
                (dbType) => {
                  const option = databaseOptions[dbType];
                  const isSelected = config.type === dbType;
                  const isDisabled = dbType !== "mssql";

                  return (
                    <button
                      key={dbType}
                      onClick={() =>
                        !isDisabled && handleDatabaseTypeChange(dbType)
                      }
                      disabled={isDisabled}
                      className={`
                      relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all shadow-sm
                      ${
                        isSelected
                          ? "border-primary/70 bg-primary/5 ring-1 ring-primary/40"
                          : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                      }
                      ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed bg-slate-100"
                          : "cursor-pointer"
                      }
                    `}
                    >
                      <div
                        className={`p-3 rounded-lg bg-white shadow-sm border ${
                          isDisabled ? "grayscale" : ""
                        }`}
                      >
                        <Server className={`size-6 ${option.color}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Default Port: {option.port}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="size-5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                }
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="gap-2"
              >
                Next Step <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Connection Details</CardTitle>
            <CardDescription className="text-slate-600">
              Enter credentials for{" "}
              {databaseOptions[config.type as DatabaseType]?.label}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Connection Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Production Replica"
                  value={config.name}
                  onChange={(e) =>
                    setConfig({ ...config, name: e.target.value })
                  }
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="host">Host / IP</Label>
                  <Input
                    id="host"
                    placeholder="127.0.0.1"
                    value={config.host}
                    onChange={(e) =>
                      setConfig({ ...config, host: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    value={config.port}
                    onChange={(e) =>
                      setConfig({ ...config, port: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  placeholder="SalesDB"
                  value={config.database}
                  onChange={(e) =>
                    setConfig({ ...config, database: e.target.value })
                  }
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) =>
                      setConfig({ ...config, username: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password}
                    onChange={(e) =>
                      setConfig({ ...config, password: e.target.value })
                    }
                    className="h-11"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedToStep3}>
                Verify Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Testing Connection</CardTitle>
            <CardDescription className="text-slate-600">
              We are attempting to reach your database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center min-h-[220px]">
              {connectionStatus === "idle" && (
                <div className="text-center space-y-4">
                  <HardDrive className="size-12 text-slate-500 mx-auto" />
                  <p className="text-slate-600">
                    Ready to connect to{" "}
                    <span className="font-mono text-slate-900">
                      {config.host}
                    </span>
                  </p>
                  <Button
                    onClick={handleTestConnection}
                    className="min-w-[200px]"
                  >
                    Start Test
                  </Button>
                </div>
              )}
              {connectionStatus === "testing" && (
                <div className="text-center space-y-4">
                  <Loader2 className="size-12 animate-spin text-primary mx-auto" />
                  <p className="text-slate-500 animate-pulse">
                    Authenticating...
                  </p>
                </div>
              )}
              {connectionStatus === "success" && (
                <div className="text-center space-y-4">
                  <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-emerald-700">
                      Connection Successful
                    </h3>
                    <p className="text-emerald-600/80">
                      Schema discovered. Redirecting...
                    </p>
                  </div>
                </div>
              )}
              {connectionStatus === "error" && (
                <div className="text-center space-y-4 w-full">
                  <div className="size-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="size-8 text-red-600" />
                  </div>
                  <Alert
                    variant="destructive"
                    className="max-w-md mx-auto text-left"
                  >
                    <XCircle className="size-4" />
                    <AlertDescription className="break-words">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" onClick={handleTestConnection}>
                    Retry
                  </Button>
                </div>
              )}
            </div>
            {connectionStatus === "error" && (
              <div className="flex justify-start pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="size-4 mr-2" /> Edit Configuration
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="border border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Select Tables</CardTitle>
            <CardDescription className="text-slate-600">
              We found {tables.length} tables in{" "}
              <strong>{config.database}</strong>. Pick the primary table to
              ingest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Host {config.host}</Badge>
                  {config.database && (
                    <Badge variant="outline">DB {config.database}</Badge>
                  )}
                  {sourceId && (
                    <Badge variant="outline" className="font-mono text-[11px]">
                      Source {sourceId}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">
                    Filter
                  </Label>
                  <ShadInput
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Search table name..."
                    className="h-9 w-full md:w-64"
                  />
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="space-y-1">
                {tables
                  .filter((table) =>
                    table.toLowerCase().includes(tableFilter.toLowerCase())
                  )
                  .map((table) => (
                    <div
                      key={table}
                      onClick={() => setSelectedTable(table)}
                      className={`
                        group flex items-center p-3 rounded-md cursor-pointer transition-all
                        ${
                          selectedTable === table
                            ? "bg-primary/10 border-primary ring-1 ring-primary/20"
                            : "hover:bg-white border border-transparent"
                        }
                      `}
                    >
                      <div
                        className={`p-2 rounded-md mr-3 ${
                          selectedTable === table ? "bg-white" : "bg-slate-100"
                        }`}
                      >
                        <TableIcon className="size-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-sm text-slate-900">
                        {table}
                      </span>
                      {selectedTable === table && (
                        <CheckCircle2 className="ml-auto size-5 text-primary" />
                      )}
                    </div>
                  ))}
                {tables.length === 0 && (
                  <div className="text-center text-sm text-slate-500 py-10">
                    No tables discovered. Check credentials or permissions.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-6 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back to Config
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={!selectedTable}
                className="gap-2"
              >
                Configure Schema <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && selectedTable && (
        <SchemaMapper
          tableName={selectedTable}
          fetchSchema={() =>
            onDiscoverSchema
              ? onDiscoverSchema(selectedTable)
              : Promise.resolve([])
          }
          onBack={() => setStep(4)}
          onSave={(schemaConfig) => onComplete?.(schemaConfig)}
        />
      )}
    </div>
  );
}
